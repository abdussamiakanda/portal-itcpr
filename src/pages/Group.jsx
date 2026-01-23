import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { capitalize, joinMeeting, formatDate } from '../utils/helpers';
import { supabaseConfig } from '../config';
import LoadingOverlay from '../components/LoadingOverlay';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import '../css/group.css';
import '../css/projects.css';
import '../css/modal.css';

export default function Group() {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [groupData, setGroupData] = useState(null);
    const [members, setMembers] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [projects, setProjects] = useState([]);
    const [publications, setPublications] = useState([]);
    const [stats, setStats] = useState({
        memberCount: 0,
        activeProjectCount: 0,
        publicationCount: 0
    });

    useEffect(() => {
        if (!userData) return;

        async function loadGroup() {
            setLoading(true);
            try {
                // Load critical data first (group info and stats)
                const [groupSnap, membersSnap, projectsSnap] = await Promise.all([
                    getDoc(doc(db, 'groups', userData.group)),
                    getDocs(query(collection(db, 'users'), where('group', '==', userData.group))),
                    getDocs(query(
                        collection(db, 'groups', userData.group, 'projects'),
                        where('status', '==', 'active'),
                        where('type', '==', 'project'),
                        limit(20)
                    ))
                ]);

                const groupData = groupSnap.data();
                setGroupData(groupData);

                // Process members
                const roleOrder = { lead: 1, supervisor: 2, member: 3, intern: 4 };
                const membersList = membersSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => {
                        const roleComparison = (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5);
                        if (roleComparison === 0) {
                            return a.name.localeCompare(b.name);
                        }
                        return roleComparison;
                    });
                setMembers(membersList);
                setStats(prev => ({ ...prev, memberCount: membersList.length }));

                // Process projects with lead data
                const projectsList = projectsSnap.docs.map(doc => ({
                    id: doc.id,
                    groupId: userData.group,
                    ...doc.data()
                }));

                // Get unique lead IDs
                const leadIds = new Set();
                projectsList.forEach(project => {
                    if (project.leadId) {
                        leadIds.add(project.leadId);
                    }
                });

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

                // Add lead data to projects
                const projectsWithLeadData = projectsList.map(project => ({
                    ...project,
                    leadData: project.leadId ? leadDataMap.get(project.leadId) || { name: 'Unknown' } : { name: 'Unknown' }
                }));

                setProjects(projectsWithLeadData);
                setStats(prev => ({ ...prev, activeProjectCount: projectsWithLeadData.length }));

                // Load publications from Supabase
                await loadPublications();

                // Load meetings separately (can be slower)
                const userNow = DateTime.now().setZone('America/Chicago');
                const meetingsRef = collection(db, 'meetings');
                const meetingsQuery = query(
                    meetingsRef,
                    where('group', '==', userData.group),
                    orderBy('date', 'asc'),
                    orderBy('time', 'asc'),
                    limit(50)
                );
                const meetingsSnap = await getDocs(meetingsQuery);
                
                const meetingsList = meetingsSnap.docs
                    .map(doc => {
                        const meeting = doc.data();
                        const chicagoDateTime = DateTime.fromFormat(
                            `${meeting.date} ${meeting.time}`, 
                            'yyyy-MM-dd HH:mm',
                            { zone: 'America/Chicago' }
                        );
                        return {
                            id: doc.id,
                            ...meeting,
                            chicagoDateTime,
                            isPast: chicagoDateTime < userNow
                        };
                    })
                    .filter(m => !m.isPast)
                    .slice(0, 3);
                
                setMeetings(meetingsList);
                
                // Show initial content
                setInitialLoad(false);
            } catch (error) {
                console.error('Error loading group content:', error);
            } finally {
                setLoading(false);
            }
        }

        loadGroup();
    }, [userData]);

    async function loadPublications() {
        try {
            const response = await fetch(
                `${supabaseConfig.url}/rest/v1/publications?group=eq.${capitalize(userData.group)}&order=year.desc,month.desc&select=*`,
                {
                    headers: {
                        'apikey': supabaseConfig.key,
                        'Authorization': `Bearer ${supabaseConfig.key}`
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch publications');
            }
            
            const publicationsList = await response.json();
            setPublications(publicationsList);
            setStats(prev => ({ ...prev, publicationCount: publicationsList.length }));
        } catch (error) {
            console.error('Error loading publications:', error);
            setPublications([]);
        }
    }

    const canManage = userData?.role === 'lead' || userData?.type === 'admin';

    if (loading && initialLoad) {
        return <LoadingOverlay show={true} />;
    }

    if (!groupData) {
        return <div>Group not found</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>{groupData.name} Research Group</h2>
                    <p className="text-medium">{groupData.description || 'Research Group'}</p>
                </div>
            </div>

            {/* Group Overview */}
            <div className="overview-container">
                <StatCard
                    icon="groups"
                    title="Members"
                    value={stats.memberCount}
                    info="Active Researchers"
                />

                <StatCard
                    icon="science"
                    title="Active Projects"
                    value={stats.activeProjectCount}
                    info="Active Projects"
                />

                <StatCard
                    icon="article"
                    title="Publications"
                    value={stats.publicationCount}
                    info="Research Papers"
                />
            </div>

            {/* Members Section */}
            <div className="section">
                <div className="section-header">
                    <h3>Group Members</h3>
                </div>
                <div className="members-grid">
                    {members.length > 0 ? (
                        members.map(member => (
                            <div key={member.id} className="member-card">
                                {member.photoURL ? (
                                <img 
                                        src={member.photoURL} 
                                    alt={member.name} 
                                    className="member-avatar"
                                />
                                ) : (
                                    <div className="member-avatar member-avatar-initials">
                                        {getInitials(member.name)}
                                    </div>
                                )}
                                <div className="member-info">
                                    <h4>{member.name}</h4>
                                    <p className="member-role">{capitalize(member.role)}</p>
                                    <p className="member-email">{member.email}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-medium">No members found</p>
                    )}
                </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="section">
                <div className="section-header">
                    <h3>Upcoming Meetings</h3>
                    {(canManage || userData?.type === 'manager') && (
                        <button className="btn btn-outline" onClick={() => navigate('/meetings')}>
                            View All Meetings
                        </button>
                    )}
                </div>
                <div className="meetings-list">
                    {meetings.length > 0 ? (
                        meetings.map(meeting => {
                            const localDateTime = meeting.chicagoDateTime.toLocal();
                            const formattedDateTime = localDateTime.toFormat('EEE, d LLL yyyy, h:mm a');
                            
                            return (
                                <div key={meeting.id} className="dashboard-meeting-card" data-meeting-id={meeting.id}>
                                    <div className="dashboard-meeting-icon">
                                        <span className="material-icons">video_camera_front</span>
                                    </div>
                                    <div className="dashboard-meeting-info">
                                        <h4>{meeting.title}</h4>
                                        <p className="dashboard-meeting-time">
                                            <span className="material-icons">schedule</span>
                                            {formattedDateTime}
                                        </p>
                                        {meeting.description && (
                                            <p className="dashboard-meeting-description">{meeting.description}</p>
                                        )}
                                    </div>
                                    {meeting.link && (() => {
                                        // Check if current time is within 1 hour before or after meeting time
                                        const now = DateTime.now().setZone('America/Chicago');
                                        const meetingTime = meeting.chicagoDateTime;
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
                            );
                        })
                    ) : (
                        <div className="empty-state">
                            <span className="material-icons">event_busy</span>
                            <p>No upcoming meetings</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Current Projects */}
            <div className="section">
                <div className="section-header">
                    <h3>Current Projects</h3>
                    {(canManage || userData?.type === 'manager') && (
                        <button className="btn btn-outline" onClick={() => navigate('/projects')}>
                            View All Projects
                        </button>
                    )}
                </div>
                <div className="projects-grid">
                    {projects.length > 0 ? (
                        projects.slice(0, 3).map(project => {
                            const description = project.description?.length > 300 
                                ? project.description.slice(0, 300).trim() + '...'
                                : project.description || '';
                            
                            return (
                                <div key={project.id} className="project-card" data-status={project.status} data-type={project.type || 'project'}>
                                    <div className="project-header">
                                        <h4 className="project-title">{project.title}</h4>
                                        <div className="header-badges">
                                            <span className={`status-badge ${project.status}`}>{project.status}</span>
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
                            <p>No active projects</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Publications */}
            <div className="section">
                <div className="section-header">
                    <h3>Publications</h3>
                </div>
                <div className="publications-list">
                    {publications.length > 0 ? (
                        publications.map(pub => (
                            <div key={pub.id} className="publication-card">
                                <div className="publication-header">
                                    <div className="publication-tags">
                                        <span className="publication-tag">{pub.type}</span>
                                        <span className="publication-tag">{pub.month} {pub.year}</span>
                                    </div>
                                </div>
                                <p>
                                    <b>{pub.title}</b>, {pub.authors}, {pub.journal}
                                </p>
                                {pub.doi && (
                                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <button 
                                            className="btn btn-outline btn-sm" 
                                            onClick={() => window.open(pub.doi, '_blank', 'noopener,noreferrer')}
                                        >
                                            <span className="material-icons">open_in_new</span>
                                            Read more
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <span className="material-icons">article</span>
                            <p>No publications yet</p>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}

