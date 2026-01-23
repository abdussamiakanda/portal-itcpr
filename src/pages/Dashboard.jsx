import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { formatDate, capitalize, joinMeeting } from '../utils/helpers';
import LoadingOverlay from '../components/LoadingOverlay';
import StatCard from '../components/StatCard';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import { getDiscordAuthUrl } from '../utils/discord';
import '../css/dashboard.css';
import '../css/overview.css';
import '../css/projects.css';
import '../css/modal.css';

function formatMeetingDateTime(date, time = '00:00', timezone = 'America/Chicago') {
    try {
        const meetingDateTime = DateTime.fromFormat(
            `${date} ${time}`,
            'yyyy-MM-dd HH:mm',
            { zone: timezone }
        );

        if (!meetingDateTime.isValid) {
            throw new Error('Invalid date/time');
        }

        const userDateTime = meetingDateTime.setZone(DateTime.local().zoneName);
        return userDateTime.toFormat('EEE, d LLL yyyy, h:mm a');
    } catch (error) {
        console.error('Error formatting meeting date:', error);
        return `${date} ${time}`;
    }
}


function getInternshipPeriod() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const periods = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    return `${periods[month]}, ${year}`;
}

async function checkReportStatus(userData, userId) {
    try {
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, where('uid', '==', userId));
        const reportsSnap = await getDocs(q);
        const reports = reportsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const now = new Date();
        const day = now.getDate();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        // Only allow submissions from 21st to end of month
        if (day < 21 || day > lastDay) {
            return false;
        }

        const currentPeriod = getInternshipPeriod();
        const alreadySubmitted = reports.some(r => 
            typeof r.title === 'string' && r.title.includes(currentPeriod) && r.uid === userId
        );

        return !alreadySubmitted;
    } catch (error) {
        console.error('Error checking report status:', error);
        return false;
    }
}

async function getMeetingsSnap(userData) {
    const meetingsRef = collection(db, 'meetings');
    let meetingsSnap = null;
    
    if (userData.position === 'staff') {
        const q = query(
            meetingsRef,
            orderBy('date', 'desc'),
            orderBy('time', 'desc'),
            limit(100) // Limit to recent meetings
        );
        meetingsSnap = await getDocs(q);
    } else {
        const q1 = query(
            meetingsRef,
            where('group', '==', userData.group),
            orderBy('date', 'desc'),
            orderBy('time', 'desc'),
            limit(50)
        );

        const q2 = query(
            meetingsRef,
            where('type', 'in', ['admin', 'general']),
            orderBy('date', 'desc'),
            orderBy('time', 'desc'),
            limit(50)
        );

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const allDocsMap = new Map();

        snap1.forEach(doc => allDocsMap.set(doc.id, doc.data()));
        snap2.forEach(doc => allDocsMap.set(doc.id, doc.data()));

        let combined = Array.from(allDocsMap.entries()).map(([id, data]) => ({
            id,
            ...data
        }));

        combined.sort((a, b) => {
            if (a.date === b.date) {
                return b.time.localeCompare(a.time);
            }
            return b.date.localeCompare(a.date);
        });

        meetingsSnap = {
            docs: combined.map(item => ({
                id: item.id,
                data: () => {
                    const { id, ...data } = item;
                    return data;
                }
            }))
        };
    }
    return meetingsSnap;
}

async function getNextMeeting(groupId, userData) {
    try {
        const chicagoNow = DateTime.now().setZone('America/Chicago');
        const chicagoNowMinus1hr = chicagoNow.minus({ hours: 1 });
        const userTimezone = DateTime.local().zoneName;

        const meetingsSnap = await getMeetingsSnap(userData);
        const meetings = meetingsSnap.docs
            .map(doc => {
                const data = doc.data();
                const dateTime = DateTime.fromFormat(
                    `${data.date} ${data.time}`,
                    'yyyy-MM-dd HH:mm',
                    { zone: 'America/Chicago' }
                );
                return {
                    id: doc.id,
                    ...data,
                    dateTime
                };
            })
            .filter(meeting => meeting.dateTime >= chicagoNowMinus1hr)
            .sort((a, b) => a.dateTime - b.dateTime);

        const nextMeeting = meetings[0];

        if (!nextMeeting || !nextMeeting.dateTime.isValid) {
            return {
                value: 'No meetings',
                info: 'No upcoming meetings'
            };
        }

        const userDateTime = nextMeeting.dateTime.setZone(userTimezone);
        const userNow = DateTime.now();

        let dateDisplay;
        if (userDateTime.hasSame(userNow, 'day')) {
            dateDisplay = 'Today';
        } else if (userDateTime.hasSame(userNow.plus({ days: 1 }), 'day')) {
            dateDisplay = 'Tomorrow';
        } else {
            dateDisplay = userDateTime.toFormat('EEE, LLL d');
        }

        const timeStr = userDateTime.toFormat('h:mm a');

        return {
            value: dateDisplay,
            info: `${timeStr} - ${nextMeeting.title}`
        };
    } catch (error) {
        console.error('Error getting next meeting:', error);
        return {
            value: 'Error',
            info: 'Failed to load next meeting'
        };
    }
}

async function getProjectStats(groupId, userId) {
    try {
        const projectsRef = collection(db, 'groups', groupId, 'projects');
        const projectsSnap = await getDocs(projectsRef);

        let totalActive = 0;
        let involvedCount = 0;
        let summaryCount = 0;
        let outlineCount = 0;

        // Batch all subcollection queries
        const batchQueries = [];
        const activeProjects = [];

        for (const projectDoc of projectsSnap.docs) {
            const project = projectDoc.data();
            if (project.status?.toLowerCase() === 'completed') continue;

            totalActive++;
            activeProjects.push(projectDoc.id);

            // Prepare batch queries
            batchQueries.push(
                getDocs(collection(db, 'groups', groupId, 'projects', projectDoc.id, 'contributors')),
                getDocs(collection(db, 'groups', groupId, 'projects', projectDoc.id, 'summaries')),
                getDocs(collection(db, 'groups', groupId, 'projects', projectDoc.id, 'outline'))
            );
        }

        // Execute all queries in parallel
        const results = await Promise.all(batchQueries);
        
        // Process results
        for (let i = 0; i < activeProjects.length; i++) {
            const baseIdx = i * 3;
            const contributorsSnap = results[baseIdx];
            const summariesSnap = results[baseIdx + 1];
            const outlinesSnap = results[baseIdx + 2];

            if (contributorsSnap.docs.some(doc => doc.data().userId === userId)) {
                involvedCount++;
            }

            summariesSnap.docs.forEach(doc => {
                if (doc.data().userId === userId) {
                    summaryCount++;
                }
            });

            outlinesSnap.docs.forEach(doc => {
                if (doc.data().userId === userId) {
                    outlineCount++;
                }
            });
        }

        return {
            total: totalActive,
            involved: involvedCount,
            summary: summaryCount,
            outline: outlineCount
        };
    } catch (error) {
        console.error('Error getting project stats:', error);
        return { total: 0, involved: 0, summary: 0, outline: 0 };
    }
}

async function getCurrentProjects(groupId, userId) {
    try {
        const projectsRef = collection(db, 'groups', groupId, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        let userProjects = [];
        const projectIds = [];

        // First pass: collect active project IDs (exclude courses)
        for (const projectDoc of projectsSnap.docs) {
            const project = projectDoc.data();
            if (project.status?.toLowerCase() === 'completed' || project.status?.toLowerCase() === 'planning') continue;
            if (project.type === 'course') continue; // Exclude courses
            projectIds.push(projectDoc.id);
        }

        // Batch query all contributors at once
        const contributorQueries = projectIds.map(projectId =>
            getDocs(collection(db, 'groups', groupId, 'projects', projectId, 'contributors'))
        );

        const contributorResults = await Promise.all(contributorQueries);

        // Get unique lead IDs (exclude courses)
        const leadIds = new Set();
        let idx = 0;
        for (const projectDoc of projectsSnap.docs) {
            const project = projectDoc.data();
            if (project.status?.toLowerCase() === 'completed' || project.status?.toLowerCase() === 'planning') continue;
            if (project.type === 'course') continue; // Exclude courses
            if (project.leadId) {
                leadIds.add(project.leadId);
            }
        }

        // Batch fetch all lead data
        const leadQueries = Array.from(leadIds).map(leadId => getDoc(doc(db, 'users', leadId)));
        const leadResults = await Promise.all(leadQueries);
        const leadDataMap = new Map();
        leadResults.forEach((leadSnap, i) => {
            if (leadSnap.exists()) {
                const leadId = Array.from(leadIds)[i];
                leadDataMap.set(leadId, leadSnap.data());
            }
        });

        // Match projects with user involvement (exclude courses)
        // Create a map of project IDs to project documents for quick lookup
        const projectMap = new Map();
        for (const projectDoc of projectsSnap.docs) {
            projectMap.set(projectDoc.id, projectDoc);
        }

        // Iterate through projectIds to maintain correct index alignment with contributorResults
        for (let idx = 0; idx < projectIds.length; idx++) {
            const projectId = projectIds[idx];
            const projectDoc = projectMap.get(projectId);
            if (!projectDoc) continue;

            const project = projectDoc.data();
            const contributorsSnap = contributorResults[idx];
            const isContributor = contributorsSnap.docs.some(doc => doc.data().userId === userId);
            const contributorCount = contributorsSnap.docs.length;
            
            // Get publications count (only for projects, not courses)
            let publicationCount = 0;
            if (project.type === 'project') {
                try {
                    const publicationsRef = collection(db, 'groups', groupId, 'projects', projectId, 'publications');
                    const publicationsSnap = await getDocs(publicationsRef);
                    publicationCount = publicationsSnap.docs.length;
                } catch (err) {
                    console.error('Error fetching publications:', err);
                }
            }
            
            if (isContributor) {
                const leadData = project.leadId ? leadDataMap.get(project.leadId) : null;
                userProjects.push({
                    id: projectDoc.id,
                    groupId: groupId,
                    groupName: groupId, // Store group name (groupId is the group name)
                    ...project,
                    isContributor: true,
                    contributorCount,
                    publicationCount,
                    leadData: leadData || { name: 'Unknown' }
                });
            }
        }

        userProjects.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));

        return userProjects.slice(0, 5); // Limit to 5 projects
    } catch (error) {
        console.error('Error getting current projects:', error);
        return [];
    }
}

async function getUpcomingMeetings(groupId, userData) {
    try {
        const chicagoNowMinus1hr = DateTime.now().setZone('America/Chicago').minus({ hours: 1 });

        let allMeetings = [];
        const meetingsSnap = await getMeetingsSnap(userData);

        meetingsSnap.docs.forEach(doc => {
            const data = doc.data();
            const dateTime = DateTime.fromFormat(
                `${data.date} ${data.time}`,
                'yyyy-MM-dd HH:mm',
                { zone: 'America/Chicago' }
            );

            if (dateTime.isValid && dateTime >= chicagoNowMinus1hr) {
                allMeetings.push({
                    id: doc.id,
                    ...data,
                    dateTime
                });
            }
        });

        allMeetings.sort((a, b) => a.dateTime - b.dateTime);

        return allMeetings.slice(0, 4);
    } catch (error) {
        console.error('Error getting upcoming meetings:', error);
        return [];
    }
}

async function getAttendanceStats(groupId, email) {
    try {
        // Only get meetings from the user's group or general/admin meetings
        const meetingsRef = collection(db, 'meetings');
        const q1 = query(meetingsRef, where('group', '==', groupId), limit(100));
        const q2 = query(meetingsRef, where('type', 'in', ['admin', 'general']), limit(50));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const allMeetingsMap = new Map();
        
        snap1.docs.forEach(doc => allMeetingsMap.set(doc.id, doc));
        snap2.docs.forEach(doc => allMeetingsMap.set(doc.id, doc));
        
        const meetingIds = Array.from(allMeetingsMap.keys());
        const totalMeetings = meetingIds.length;

        // Batch query all participants
        const participantQueries = meetingIds.map(meetingId =>
            getDocs(collection(db, 'meetings', meetingId, 'participants'))
        );

        const participantResults = await Promise.all(participantQueries);
        
        let attendedMeetings = 0;
        participantResults.forEach(snap => {
            if (snap.docs.some(doc => doc.data().email === email)) {
                attendedMeetings++;
            }
        });

        return {
            total: totalMeetings,
            attended: attendedMeetings
        };
    } catch (error) {
        console.error('Error getting attendance stats:', error);
        return { total: 0, attended: 0 };
    }
}


export default function Dashboard() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [groupData, setGroupData] = useState(null);
    const [memberCount, setMemberCount] = useState(0);
    const [nextMeeting, setNextMeeting] = useState({ value: 'Loading...', info: '' });
    const [projectStats, setProjectStats] = useState({ total: 0, involved: 0, summary: 0, outline: 0 });
    const [currentProjects, setCurrentProjects] = useState([]);
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [attendance, setAttendance] = useState({ total: 0, attended: 0 });
    const [showDiscordModal, setShowDiscordModal] = useState(false);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);

    useEffect(() => {
        if (!user || !userData) return;

        async function loadDashboard() {
            setLoading(true);
            setInitialLoad(true);
            try {
                // Load critical data first (group info and member count)
                const [groupSnap, memberSnap] = await Promise.all([
                    getDoc(doc(db, 'groups', userData.group)),
                    getDocs(collection(db, 'groups', userData.group, 'members'))
                ]);
                
                setGroupData(groupSnap.data());
                setMemberCount(memberSnap.size);

                // Load next meeting immediately (most important)
                const next = await getNextMeeting(userData.group, userData);
                setNextMeeting(next);
                
                // Show initial content
                setInitialLoad(false);

                // Load remaining data in parallel (non-blocking)
                Promise.all([
                    getProjectStats(userData.group, user.uid),
                    getCurrentProjects(userData.group, user.uid),
                        getUpcomingMeetings(userData.group, userData),
                        getAttendanceStats(userData.group, user.email)
                    ]).then(([stats, projects, meetings, att]) => {
                        setProjectStats(stats);
                        setCurrentProjects(projects);
                        setUpcomingMeetings(meetings);
                        setAttendance(att);
                    }).catch(error => {
                    console.error('Error loading secondary dashboard data:', error);
                });

                // Check for Discord and Evaluation modals (matching old code logic)
                // First check Discord - if no discordId, show modal
                if (!userData.discordId) {
                    setShowDiscordModal(true);
                }
                
                // Check Report:
                // - Only for interns, and only AFTER they have joined Discord
                // - Supervisors don't need report modal
                if (userData.role === 'intern' && userData.discordId) {
                    const allowReport = await checkReportStatus(userData, user.uid);
                    if (allowReport) {
                        setShowEvaluationModal(true);
                    }
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, [user, userData]);

    if (loading && initialLoad) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Dashboard</h2>
                    <p className="text-medium">Welcome back to your research portal</p>
                </div>
            </div>

            <div className="overview-container">
                <StatCard
                    icon="groups"
                    title="Your Group"
                    value={groupData?.name || 'Loading...'}
                    info={`Members: ${memberCount}`}
                />

                <StatCard
                    icon="calendar_today"
                    title="Next Meeting"
                    value={nextMeeting.value}
                    info={nextMeeting.info}
                />

                <StatCard
                    icon="science"
                    title="Group Projects"
                    value={`Total: ${projectStats.total}`}
                    info={`Involved in ${projectStats.involved} project${projectStats.involved !== 1 ? 's' : ''}`}
                />

                <StatCard
                    icon="notifications"
                    title="Meeting Attendance"
                    value={`Attnd: ${attendance.attended}`}
                    info={`Attended ${attendance.attended} out of ${attendance.total} meeting${attendance.total !== 1 ? 's' : ''}`}
                />

                <StatCard
                    icon="science"
                    title="Project Contribution"
                    value={`Total: ${projectStats.summary + projectStats.outline}`}
                    info={`${projectStats.outline} outlines and ${projectStats.summary} summaries`}
                />
            </div>

            <div className="section">
                <div className="section-header">
                    <h3>Upcoming Meetings</h3>
                    <button className="btn btn-outline" onClick={() => navigate('/meetings')}>
                        View All Meetings
                    </button>
                </div>
                <div className="dashboard-meetings-list">
                    {upcomingMeetings.length > 0 ? (
                        upcomingMeetings.slice(0, 2).map(meeting => (
                            <div key={meeting.id} className="dashboard-meeting-card" data-meeting-id={meeting.id}>
                                <div className="dashboard-meeting-icon">
                                    <span className="material-icons">video_camera_front</span>
                                </div>
                                <div className="dashboard-meeting-info">
                                    <h4>{meeting.title}</h4>
                                    <p className="dashboard-meeting-time">
                                        <span className="material-icons">schedule</span>
                                        {formatMeetingDateTime(meeting.date, meeting.time, meeting.timezone)}
                                    </p>
                                </div>
                                {meeting.link && (() => {
                                    // Check if current time is within 1 hour before or after meeting time
                                    const now = DateTime.now().setZone('America/Chicago');
                                    const meetingTime = meeting.dateTime;
                                    const oneHourBefore = meetingTime.minus({ hours: 1 });
                                    const oneHourAfter = meetingTime.plus({ hours: 1 });
                                    const canJoin = now >= oneHourBefore && now <= oneHourAfter;
                                    
                                    return canJoin ? (
                                        <button 
                                            className="btn btn-primary btn-sm" 
                                            onClick={() => joinMeeting(meeting.link, meeting.id)}
                                        >
                                            <span className="material-icons">video_camera_front</span>
                                            Join Meeting
                                        </button>
                                    ) : null;
                                })()}
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <span className="material-icons">event_busy</span>
                            <p>No upcoming meetings scheduled</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h3>Current Projects</h3>
                    <button className="btn btn-outline" onClick={() => navigate('/projects')}>
                        View All Projects
                    </button>
                </div>
                <div className="projects-overview projects-grid">
                    {currentProjects.length > 0 ? (
                        currentProjects.slice(0, 3).map(project => {
                            const description = project.description?.length > 300 
                                ? project.description.slice(0, 300).trim() + '...'
                                : project.description || '';
                            
                            return (
                                <div key={project.id} className="project-card" data-status={project.status} data-type={project.type || 'project'}>
                                    <div className="project-header">
                                        <h4 className="project-title">{project.title}</h4>
                                        <div className="header-badges">
                                            <span className={`status-badge ${project.status}`}>{project.status}</span>
                                            {project.groupName && (
                                                <span className="group-badge">{capitalize(project.groupName)}</span>
                                            )}
                                            {project.contributorCount !== undefined && (
                                                <span className="contributor-count-badge">
                                                    <span className="material-icons" style={{ fontSize: '0.875rem', verticalAlign: 'middle', marginRight: '2px' }}>people</span>
                                                    {project.contributorCount}
                                                </span>
                                            )}
                                            {project.type === 'project' && project.publicationCount !== undefined && project.publicationCount > 0 && (
                                                <span className="publication-count-badge">
                                                    <span className="material-icons" style={{ fontSize: '0.875rem', verticalAlign: 'middle', marginRight: '2px' }}>menu_book</span>
                                                    {project.publicationCount}
                                                </span>
                                            )}
                                            <span className="access">
                                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                                                    <path d="M702-480 560-622l57-56 85 85 170-170 56 57-226 226Zm-342 0q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm80-80h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 260Zm0-340Z"/>
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                    {description && <p className="project-description">{description}</p>}
                                    <div className="project-meta">
                                        <div className="meta-item">
                                            <span className="lead-name">
                                                {project.type === 'course' ? 'Course Lead' : 'Principal Investigator'}: {project.leadData?.name || 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="meta-item">
                                            <span>Start: {formatDate(project.startDate)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span>Due: {formatDate(project.dueDate)}</span>
                                        </div>
                                    </div>
                                    <div className="project-actions">
                                        <div className="actions-group">
                                            <button 
                                                className="btn btn-primary" 
                                                onClick={() => navigate(`/${project.type === 'course' ? 'course' : 'project'}/${project.id}`)}
                                            >
                                                <span className="material-icons">visibility</span>
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="empty-state">
                            <span className="material-icons">science</span>
                            <p>You're not involved in any projects yet.</p>
                        </div>
                    )}
                </div>
            </div>


            {/* Discord Modal */}
            <Modal isOpen={showDiscordModal} onClose={userData?.role === 'supervisor' ? () => setShowDiscordModal(false) : undefined}>
                <ModalHeader onClose={userData?.role === 'supervisor' ? () => setShowDiscordModal(false) : undefined}>
                    <h3>Join ITCPR Discord Server</h3>
                </ModalHeader>
                <ModalBody>
                    <div className="form-group">
                        <p>
                            You have not joined the ITCPR Discord server yet. Please join the server to get
                            access to the community and resources.
                            <br />
                            <br />
                            Click the button below to join the server.
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    {userData?.role === 'supervisor' && (
                        <button className="btn btn-secondary" onClick={() => setShowDiscordModal(false)}>
                            Close
                        </button>
                    )}
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            window.location.href = getDiscordAuthUrl();
                        }}
                    >
                        Join Discord
                    </button>
                </ModalFooter>
            </Modal>

            {/* Report Modal */}
            <Modal isOpen={showEvaluationModal} onClose={() => setShowEvaluationModal(false)}>
                <ModalHeader onClose={() => setShowEvaluationModal(false)}>
                    <h3>Report Reminder</h3>
                </ModalHeader>
                <ModalBody>
                    <div className="form-group">
                        <p>
                            You have not yet completed your monthly report for this month.
                            Completing your report is essential to track your progress and growth.
                        </p>
                        <p>
                            Please click the button below to complete your report.
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-secondary" onClick={() => setShowEvaluationModal(false)}>
                        Close
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            setShowEvaluationModal(false);
                            navigate('/report');
                        }}
                    >
                        Complete Report
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}


