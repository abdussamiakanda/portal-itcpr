import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { collection, doc, query, orderBy, where, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, limit, getDoc } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { capitalize, joinMeeting } from '../utils/helpers';
import { sendMeetingEmail, sendMeetingDeleteEmail, sendAttendanceEmail } from '../utils/email';
import { sendMessageToChannel } from '../utils/discord';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import '../css/meetings.css';
import '../css/dashboard.css';
import '../css/modal.css';
import '../css/projects.css';

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function getUserInfo(email, db) {
    const { collection: col, query: q, where: w, getDocs: get } = await import('firebase/firestore');
    const userRef = col(db, 'users');
    const queryRef = q(userRef, w('email', '==', email));
    const userSnap = await get(queryRef);
        
    if (userSnap.empty) {
        return null;
    } 
    
    const user = userSnap.docs[0].data();
    return {
        name: user.name,
        photo: user.photoURL || 'https://www.gravatar.com/avatar/' + btoa(email.trim().toLowerCase()) + '?d=mp',
    };
}

export default function Meetings() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('upcoming');
    
    // Modal states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEmailConfirm, setShowEmailConfirm] = useState(false);
    const [showExcuseModal, setShowExcuseModal] = useState(false);
    const [excusingMeetingId, setExcusingMeetingId] = useState(null);
    const [excuseReason, setExcuseReason] = useState('');
    const isTransitioningRef = useRef(false);
    
    // Form states
    const [meetingFormData, setMeetingFormData] = useState({
        type: 'group',
        title: '',
        description: '',
        date: '',
        time: '',
        link: ''
    });
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [attendanceMeetingId, setAttendanceMeetingId] = useState(null);
    const [attendanceEmailList, setAttendanceEmailList] = useState({});
    const [availableUsers, setAvailableUsers] = useState([]);
    const [deletingMeeting, setDeletingMeeting] = useState(null);
    const [viewingAttendance, setViewingAttendance] = useState(false);
    const [existingParticipants, setExistingParticipants] = useState([]);
    const [excusesMap, setExcusesMap] = useState({}); // Map of email -> excuse data
    
    // Loading states
    const [loadingStates, setLoadingStates] = useState({
        scheduling: false,
        updating: false,
        deleting: false,
        addingAttendance: false,
        loadingLinks: false,
        submittingExcuse: false
    });

    // Get meeting link from Firestore
    async function getMeetingLink(applyChange, type) {
        try {
            setLoadingStates(prev => ({ ...prev, loadingLinks: true }));
            const linkRef = doc(db, 'links', 'meetings');
            const linkSnap = await getDoc(linkRef);
            
            if (!linkSnap.exists()) {
                return '';
            }
            
            const linkData = linkSnap.data();
            const links = {
                spintronics: linkData.spintronics,
                photonics: linkData.photonics,
                admin: linkData.admin,
                general: linkData.general
            };
            
            if (applyChange && type) {
                if (type === 'group') {
                    return links[userData.group] || '';
                } else if (type === 'admin') {
                    return links['admin'] || '';
                } else {
                    return links['general'] || '';
                }
            }
            
            return links[userData.group] || '';
        } catch (error) {
            console.error('Error getting meeting link:', error);
            return '';
        } finally {
            setLoadingStates(prev => ({ ...prev, loadingLinks: false }));
        }
    }

    const loadMeetings = async () => {
        if (!user || !userData) return;

        setLoading(true);
        try {
            const meetingsRef = collection(db, 'meetings');
            let meetingsSnap = null;

            if (userData.position === 'staff') {
                const q = query(
                    meetingsRef,
                    orderBy('date', 'desc'),
                    orderBy('time', 'desc'),
                    limit(20)
                );
                meetingsSnap = await getDocs(q);
            } else {
                const q1 = query(
                    meetingsRef,
                    where('group', '==', userData.group),
                    orderBy('date', 'desc'),
                    orderBy('time', 'desc'),
                    limit(10)
                );

                const q2 = query(
                    meetingsRef,
                    where('type', 'in', ['admin', 'general']),
                    orderBy('date', 'desc'),
                    orderBy('time', 'desc'),
                    limit(10)
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

            // Load participants and excuses for each meeting
            const meetingsWithParticipants = await Promise.all(
                meetingsSnap.docs.map(async (meetingDoc) => {
                    const meeting = meetingDoc.data();
                    const participantRef = collection(db, 'meetings', meetingDoc.id, 'participants');
                    const participantsSnap = await getDocs(participantRef);
                    
                    // Check if user has already submitted an excuse
                    const excuseRef = collection(db, 'meetings', meetingDoc.id, 'excuses');
                    const excusesSnap = await getDocs(excuseRef);
                    const hasExcuse = excusesSnap.docs.some(doc => doc.data().userId === user.uid);
                    
                    const chicagoDateTime = DateTime.fromFormat(
                        `${meeting.date} ${meeting.time}`, 
                        'yyyy-MM-dd HH:mm',
                        { zone: 'America/Chicago' }
                    );
                    
                    const userNow = DateTime.now().setZone('America/Chicago');
                    const userOneHourAgo = userNow.minus({ hours: 1 });
                    const isPast = chicagoDateTime < userOneHourAgo;

                    // Get participant info
                    const participants = await Promise.all(
                        participantsSnap.docs.map(async (doc) => {
                            const temp = doc.data();
                            const participant = await getUserInfo(temp.email, db);
                            return {
                                ...temp,
                                name: participant?.name || temp.email,
                                photo: participant?.photo
                            };
                        })
                    );

                    return {
                        id: meetingDoc.id,
                        ...meeting,
                        participants,
                        isPast,
                        chicagoDateTime,
                        hasExcuse
                    };
                })
            );

            setMeetings(meetingsWithParticipants);
            setFilteredMeetings(meetingsWithParticipants);
        } catch (error) {
            console.error('Error loading meetings:', error);
            toast.error('Failed to load meetings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMeetings();
    }, [user, userData]);

    useEffect(() => {
        let filtered = meetings;

        // Apply time filter
        const userNow = DateTime.now().setZone('America/Chicago');
        const userOneHourAgo = userNow.minus({ hours: 1 });

        if (filter === 'upcoming') {
            filtered = filtered.filter(m => m.chicagoDateTime >= userOneHourAgo);
        } else if (filter === 'past') {
            filtered = filtered.filter(m => m.chicagoDateTime < userOneHourAgo);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(meeting => 
                meeting.title?.toLowerCase().includes(term) ||
                meeting.description?.toLowerCase().includes(term)
            );
        }

        // Sort by date
        filtered.sort((a, b) => {
            if (a.date === b.date) {
                return b.time.localeCompare(a.time);
            }
            return b.date.localeCompare(a.date);
        });

        setFilteredMeetings(filtered);
    }, [meetings, searchTerm, filter]);

    const canSchedule = userData?.position === 'staff';

    const handleScheduleMeeting = async () => {
        const link = await getMeetingLink(false);
        setMeetingFormData({
            type: 'group',
            title: '',
            description: '',
            date: '',
            time: '',
            link: link
        });
        setShowScheduleModal(true);
    };

    const handleMeetingTypeChange = async (type) => {
        const link = await getMeetingLink(true, type);
        setMeetingFormData(prev => ({ ...prev, type, link }));
    };

    const handleSubmitMeeting = async () => {
        const { type, title, description, date, time, link } = meetingFormData;

        if (!title || !description || !date || !time || !link) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoadingStates(prev => ({ ...prev, scheduling: true }));

        try {
            const localDateTime = DateTime.fromFormat(
                `${date} ${time}`,
                'yyyy-MM-dd HH:mm',
                { zone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            );

            const dhakaDateTime = localDateTime.setZone('Asia/Dhaka');
            const chicagoDateTime = localDateTime.setZone('America/Chicago');

            const meetingData = {
                title,
                description,
                date: chicagoDateTime.toFormat('yyyy-MM-dd'),
                time: chicagoDateTime.toFormat('HH:mm'),
                timezone: 'America/Chicago',
                link,
                type,
                group: userData.group,
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser.uid
            };

            const meetingsRef = collection(db, 'meetings');
            await addDoc(meetingsRef, meetingData);

            // Send emails
            await sendMeetingEmail(meetingData, userData);
            
            // Send Discord notification
            const channel = type === 'group' ? userData.group : (type === 'admin' ? 'admin' : 'general');
            await sendMessageToChannel(channel, `A new meeting has been scheduled:
**Title: ${meetingData.title}**
- Date: ${dhakaDateTime.toFormat('dd MMMM yyyy')}
- Time: ${dhakaDateTime.toFormat('hh:mm a')} (Timezone: Asia/Dhaka)
- Description: ${meetingData.description}
- Meeting Link: ${meetingData.link}`);

            toast.success('Meeting scheduled successfully');
            setShowScheduleModal(false);
            
            // Reload meetings
            await loadMeetings();
        } catch (error) {
            console.error('Error scheduling meeting:', error);
            toast.error('Failed to schedule meeting');
        } finally {
            setLoadingStates(prev => ({ ...prev, scheduling: false }));
        }
    };

    const handleEditMeeting = (meeting) => {
        setEditingMeeting(meeting);
        
        // Convert Chicago time to user's local time for the form
        const chicagoDateTime = DateTime.fromFormat(
            `${meeting.date} ${meeting.time}`,
            'yyyy-MM-dd HH:mm',
            { zone: 'America/Chicago' }
        );
        const localDateTime = chicagoDateTime.toLocal();
        
        setMeetingFormData({
            type: meeting.type,
            title: meeting.title,
            description: meeting.description,
            date: localDateTime.toFormat('yyyy-MM-dd'),
            time: localDateTime.toFormat('HH:mm'),
            link: meeting.link
        });
        setShowEditModal(true);
    };

    const handleUpdateMeeting = async () => {
        const { title, description, date, time, link } = meetingFormData;

        if (!title || !description || !date || !time || !link) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoadingStates(prev => ({ ...prev, updating: true }));

        try {
            const localDateTime = DateTime.fromFormat(
                `${date} ${time}`,
                'yyyy-MM-dd HH:mm',
                { zone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            );

            const dhakaDateTime = localDateTime.setZone('Asia/Dhaka');
            const chicagoDateTime = localDateTime.setZone('America/Chicago');

            const meetingRef = doc(db, 'meetings', editingMeeting.id);
            const meetingSnap = await getDoc(meetingRef);
            const meetingDataDB = meetingSnap.data();

            const meetingData = {
                title,
                description,
                date: chicagoDateTime.toFormat('yyyy-MM-dd'),
                time: chicagoDateTime.toFormat('HH:mm'),
                timezone: 'America/Chicago',
                link,
                type: meetingDataDB.type,
                group: meetingDataDB.group,
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser.uid
            };

            await updateDoc(meetingRef, meetingData);

            // Send emails
            await sendMeetingEmail(meetingData, userData);
            
            // Send Discord notification
            const channel = meetingData.type === 'group' ? meetingDataDB.group : (meetingData.type === 'admin' ? 'admin' : 'general');
            await sendMessageToChannel(channel, `A new meeting has been scheduled:
**Title: ${meetingData.title}**
- Date: ${dhakaDateTime.toFormat('dd MMMM yyyy')}
- Time: ${dhakaDateTime.toFormat('hh:mm a')} (Timezone: Asia/Dhaka)
- Description: ${meetingData.description}
- Meeting Link: ${meetingData.link}`);

            toast.success('Meeting updated successfully');
            setShowEditModal(false);
            
            // Reload meetings
            await loadMeetings();
        } catch (error) {
            console.error('Error updating meeting:', error);
            toast.error('Failed to update meeting');
        } finally {
            setLoadingStates(prev => ({ ...prev, updating: false }));
        }
    };

    const handleDeleteMeeting = async (meeting) => {
        setDeletingMeeting(meeting);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteMeeting = async (sendEmail) => {
        if (!deletingMeeting) return;

        // Close dialogs and clear state immediately to prevent duplicate calls
        const meetingToDelete = deletingMeeting;
        setShowDeleteConfirm(false);
        setShowEmailConfirm(false);
        setDeletingMeeting(null);

        setLoadingStates(prev => ({ ...prev, deleting: true }));

        try {
            const meetingRef = doc(db, 'meetings', meetingToDelete.id);
            const meetingSnap = await getDoc(meetingRef);
            const meetingData = meetingSnap.data();
            
            // Delete all subcollections before deleting the meeting document
            // Delete participants subcollection
            const participantRef = collection(db, 'meetings', meetingToDelete.id, 'participants');
            const participantsSnap = await getDocs(participantRef);
            await Promise.all(participantsSnap.docs.map(doc => deleteDoc(doc.ref)));
            
            // Delete excuses subcollection
            const excuseRef = collection(db, 'meetings', meetingToDelete.id, 'excuses');
            const excusesSnap = await getDocs(excuseRef);
            await Promise.all(excusesSnap.docs.map(doc => deleteDoc(doc.ref)));
            
            // Now delete the meeting document
            await deleteDoc(meetingRef);

            if (sendEmail) {
                // Meeting data is stored in Chicago timezone
                const chicagoDateTime = DateTime.fromFormat(
                    `${meetingData.date} ${meetingData.time}`,
                    'yyyy-MM-dd HH:mm',
                    { zone: 'America/Chicago' }
                );
                const dhakaDateTime = chicagoDateTime.setZone('Asia/Dhaka');

                await sendMeetingDeleteEmail(meetingData, userData);
                
                const channel = meetingData.type === 'group' ? meetingData.group : (meetingData.type === 'admin' ? 'admin' : 'general');
                await sendMessageToChannel(channel, `A scheduled meeting has been cancelled:
**Title: ${meetingData.title}**
- Date: ${dhakaDateTime.toFormat('dd MMMM yyyy')}
- Time: ${dhakaDateTime.toFormat('hh:mm a')} (Timezone: Asia/Dhaka)
- Description: ${meetingData.description}`);
            }

            toast.success('Meeting deleted successfully');
            
            // Reload meetings
            await loadMeetings();
        } catch (error) {
            console.error('Error deleting meeting:', error);
            toast.error('Failed to delete meeting');
        } finally {
            setLoadingStates(prev => ({ ...prev, deleting: false }));
        }
    };

    const handleAddAttendance = async (meetingId) => {
        setAttendanceMeetingId(meetingId);
        setAttendanceEmailList({});
        
        const isStaff = userData?.position === 'staff';
        
        // Check if there are existing participants
        try {
            const participantRef = collection(db, 'meetings', meetingId, 'participants');
            const participantsSnap = await getDocs(participantRef);
            
            if (participantsSnap.docs.length > 0) {
                // Load existing participants with user info for view-only mode
                const participantsWithInfo = await Promise.all(
                    participantsSnap.docs.map(async (doc) => {
                        const data = doc.data();
                        const userInfo = await getUserInfo(data.email, db);
                        // Get user's group from Firestore
                        const usersRef = collection(db, 'users');
                        const userQuery = query(usersRef, where('email', '==', data.email));
                        const userSnap = await getDocs(userQuery);
                        const userData = userSnap.docs[0]?.data();
                        
                        return {
                            email: data.email,
                            attended: data.attended,
                            name: userInfo?.name || data.email,
                            group: userData?.group || ''
                        };
                    })
                );
                
                setExistingParticipants(participantsWithInfo);
                // Always show view-only when participants exist (both staff and non-staff can view)
                setViewingAttendance(true);
                setShowAttendanceModal(true);
                return;
            }
        } catch (error) {
            console.error('Error loading participants:', error);
        }
        
        // No existing participants
        // If not staff, don't show anything (no participants to view)
        if (!isStaff) {
            toast.info('No attendance recorded yet');
            return;
        }
        
        // Staff can add attendance
        setViewingAttendance(false);
        setExistingParticipants([]);
        
        // Load all users for editable form and excuses
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('group'), orderBy('name'));
            const usersSnap = await getDocs(q);

            const sortedDocs = usersSnap.docs.sort((a, b) => {
                const groupA = a.data().group;
                const groupB = b.data().group;
            
                if (groupA === userData.group && groupB !== userData.group) return -1;
                if (groupB === userData.group && groupA !== userData.group) return 1;

                return a.data().name.localeCompare(b.data().name);
            });

            setAvailableUsers(sortedDocs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            // Load excuses for this meeting
            try {
                const excuseRef = collection(db, 'meetings', meetingId, 'excuses');
                const excusesSnap = await getDocs(excuseRef);
                const excuses = {};
                excusesSnap.docs.forEach(doc => {
                    const excuseData = doc.data();
                    if (excuseData.email) {
                        excuses[excuseData.email] = {
                            reason: excuseData.reason,
                            createdAt: excuseData.createdAt
                        };
                    }
                });
                setExcusesMap(excuses);
            } catch (error) {
                console.error('Error loading excuses:', error);
                setExcusesMap({});
            }
            
            setShowAttendanceModal(true);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users');
        }
    };

    const handleToggleAttendance = (email, status) => {
        setAttendanceEmailList(prev => {
            const newList = { ...prev };
            // If clicking the same status, uncheck it
            if (newList[email] === status) {
                delete newList[email];
            } else {
                // Set the new status (mutually exclusive)
                newList[email] = status;
            }
            return newList;
        });
    };

    const handleUpdateAttendance = async () => {
        if (!attendanceMeetingId || Object.keys(attendanceEmailList).length === 0) {
            toast.error('Please select attendees');
            return;
        }

        setLoadingStates(prev => ({ ...prev, addingAttendance: true }));

        try {
            const participantRef = collection(db, 'meetings', attendanceMeetingId, 'participants');

            const entries = Object.entries(attendanceEmailList);

            await Promise.all(entries.map(async ([email, attended]) => {
                await addDoc(participantRef, {
                    email,
                    attended
                });
            }));

            await sendAttendanceEmail(attendanceEmailList, userData.group, attendanceMeetingId);

            toast.success('Attendance updated successfully');
            setShowAttendanceModal(false);
            setAttendanceEmailList({});
            setExcusesMap({});
            
            // Reload meetings
            await loadMeetings();
        } catch (error) {
            console.error('Error updating attendance:', error);
            toast.error('Failed to update attendance');
        } finally {
            setLoadingStates(prev => ({ ...prev, addingAttendance: false }));
        }
    };

    const handleExcuseMeeting = (meetingId) => {
        setExcusingMeetingId(meetingId);
        setExcuseReason('');
        setShowExcuseModal(true);
    };

    const handleSubmitExcuse = async () => {
        if (!excuseReason.trim()) {
            toast.error('Please provide a reason for your excuse');
            return;
        }

        if (!excusingMeetingId || !user || !userData) {
            toast.error('Invalid meeting or user information');
            return;
        }

        setLoadingStates(prev => ({ ...prev, submittingExcuse: true }));

        try {
            const excuseRef = collection(db, 'meetings', excusingMeetingId, 'excuses');
            await addDoc(excuseRef, {
                userId: user.uid,
                email: user.email,
                name: userData.name || user.email,
                reason: excuseReason.trim(),
                createdAt: serverTimestamp()
            });

            toast.success('Excuse submitted successfully');
            setShowExcuseModal(false);
            setExcuseReason('');
            setExcusingMeetingId(null);
            
            // Reload meetings to update hasExcuse status
            await loadMeetings();
        } catch (error) {
            console.error('Error submitting excuse:', error);
            toast.error('Failed to submit excuse');
        } finally {
            setLoadingStates(prev => ({ ...prev, submittingExcuse: false }));
        }
    };

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    const isLoading = Object.values(loadingStates).some(state => state);

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>Group Meetings</h2>
                    <p className="text-medium">Schedule and manage research meetings</p>
                </div>
                {canSchedule && (
                    <button 
                        className="btn btn-primary" 
                        onClick={handleScheduleMeeting}
                        disabled={isLoading}
                    >
                        <span className="material-icons">add</span>
                        Schedule Meeting
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="filters-container">
                <div className="search-bar">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        id="meetingSearch" 
                        placeholder="Search meetings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-buttons">
                    <button 
                        className={`btn btn-outline ${filter === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setFilter('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button 
                        className={`btn btn-outline ${filter === 'past' ? 'active' : ''}`}
                        onClick={() => setFilter('past')}
                    >
                        Past
                    </button>
                    <button 
                        className={`btn btn-outline ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                </div>
            </div>

            {/* Meetings List */}
            <div className="meetings-list">
                {filteredMeetings.length > 0 ? (
                    filteredMeetings.map(meeting => (
                        <MeetingCard 
                            key={meeting.id} 
                            meeting={meeting} 
                            userData={userData}
                            onEdit={handleEditMeeting}
                            onDelete={handleDeleteMeeting}
                            onAddAttendance={handleAddAttendance}
                            onExcuse={handleExcuseMeeting}
                            isLoading={isLoading}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <span className="material-icons">event</span>
                        <p>No meetings scheduled</p>
                    </div>
                )}
            </div>

            {/* Schedule Meeting Modal */}
            <Modal 
                isOpen={showScheduleModal}
                onClose={() => !loadingStates.scheduling && setShowScheduleModal(false)}
            >
                    <ModalHeader onClose={() => !loadingStates.scheduling && setShowScheduleModal(false)}>
                        <h3>Schedule Meeting</h3>
                    </ModalHeader>
                    <ModalBody>
                        <form className="form-grid">
                            <div className="form-group">
                                <label htmlFor="meetingType">Meeting Type</label>
                                <select 
                                    id="meetingType" 
                                    value={meetingFormData.type}
                                    onChange={(e) => handleMeetingTypeChange(e.target.value)}
                                    disabled={loadingStates.scheduling || loadingStates.loadingLinks}
                                    required
                                >
                                    <option value="group">Group Meeting</option>
                                    <option value="admin">Administrative Meeting</option>
                                    <option value="general">General Meeting</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="meetingTitle">Meeting Title</label>
                                <input 
                                    type="text" 
                                    id="meetingTitle" 
                                    value={meetingFormData.title}
                                    onChange={(e) => setMeetingFormData(prev => ({ ...prev, title: e.target.value }))}
                                    disabled={loadingStates.scheduling}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="meetingDescription">Description</label>
                                <textarea 
                                    id="meetingDescription" 
                                    rows="3" 
                                    value={meetingFormData.description}
                                    onChange={(e) => setMeetingFormData(prev => ({ ...prev, description: e.target.value }))}
                                    disabled={loadingStates.scheduling}
                                    required
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="meetingDate">Date</label>
                                    <input 
                                        type="date" 
                                        id="meetingDate" 
                                        value={meetingFormData.date}
                                        onChange={(e) => setMeetingFormData(prev => ({ ...prev, date: e.target.value }))}
                                        disabled={loadingStates.scheduling}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="meetingTime">Time</label>
                                    <input 
                                        type="time" 
                                        id="meetingTime" 
                                        value={meetingFormData.time}
                                        onChange={(e) => setMeetingFormData(prev => ({ ...prev, time: e.target.value }))}
                                        disabled={loadingStates.scheduling}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="meetingLink">Meeting Room</label>
                                <input 
                                    type="url" 
                                    id="meetingLink" 
                                    value={meetingFormData.link}
                                    onChange={(e) => setMeetingFormData(prev => ({ ...prev, link: e.target.value }))}
                                    disabled={loadingStates.scheduling}
                                    required
                                />
                            </div>
                        </form>
                    </ModalBody>
                    <ModalFooter>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => setShowScheduleModal(false)}
                            disabled={loadingStates.scheduling}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSubmitMeeting}
                            disabled={loadingStates.scheduling}
                        >
                            {loadingStates.scheduling ? 'Scheduling...' : 'Schedule Meeting'}
                        </button>
                    </ModalFooter>
                </Modal>

            {/* Edit Meeting Modal */}
            {editingMeeting && (
                <Modal 
                    isOpen={showEditModal}
                    onClose={() => !loadingStates.updating && setShowEditModal(false)}
                >
                    <ModalHeader onClose={() => !loadingStates.updating && setShowEditModal(false)}>
                        <h3>Edit Meeting</h3>
                    </ModalHeader>
                    <ModalBody>
                        <form className="form-grid">
                            <div className="form-group">
                                <label htmlFor="editMeetingTitle">Meeting Title</label>
                                <input 
                                    type="text" 
                                    id="editMeetingTitle" 
                                    value={meetingFormData.title}
                                    onChange={(e) => setMeetingFormData(prev => ({ ...prev, title: e.target.value }))}
                                    disabled={loadingStates.updating}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="editMeetingDescription">Description</label>
                                <textarea 
                                    id="editMeetingDescription" 
                                    rows="3" 
                                    value={meetingFormData.description}
                                    onChange={(e) => setMeetingFormData(prev => ({ ...prev, description: e.target.value }))}
                                    disabled={loadingStates.updating}
                                    required
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="editMeetingDate">Date</label>
                                    <input 
                                        type="date" 
                                        id="editMeetingDate" 
                                        value={meetingFormData.date}
                                        onChange={(e) => setMeetingFormData(prev => ({ ...prev, date: e.target.value }))}
                                        disabled={loadingStates.updating}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="editMeetingTime">Time</label>
                                    <input 
                                        type="time" 
                                        id="editMeetingTime" 
                                        value={meetingFormData.time}
                                        onChange={(e) => setMeetingFormData(prev => ({ ...prev, time: e.target.value }))}
                                        disabled={loadingStates.updating}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="editMeetingLink">Meeting Link</label>
                                <input 
                                    type="url" 
                                    id="editMeetingLink" 
                                    value={meetingFormData.link}
                                    readOnly
                                    disabled={loadingStates.updating}
                                    required
                                />
                            </div>
                        </form>
                    </ModalBody>
                    <ModalFooter>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => setShowEditModal(false)}
                            disabled={loadingStates.updating}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleUpdateMeeting}
                            disabled={loadingStates.updating}
                        >
                            {loadingStates.updating ? 'Updating...' : 'Update Meeting'}
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* Attendance Modal */}
            <Modal 
                isOpen={showAttendanceModal}
                onClose={() => !loadingStates.addingAttendance && setShowAttendanceModal(false)}
                size={!viewingAttendance ? "full" : "default"}
            >
                    <ModalHeader onClose={() => !loadingStates.addingAttendance && setShowAttendanceModal(false)}>
                        <h3>{viewingAttendance ? 'Meeting Attendance' : 'Add Meeting Attendance'}</h3>
                    </ModalHeader>
                    <ModalBody>
                        {viewingAttendance ? (
                            // Read-only view of existing participants
                            <div className="form-group">
                                <table className="checkbox-table">
                                    <thead>
                                        <tr className="checkbox-header">
                                            <th>Status</th>
                                            <th>Attendee</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {existingParticipants.map((participant, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {participant.attended === 'yes' ? '✅ Yes' : 
                                                     participant.attended === 'no' ? '❌ No' : 
                                                     '✴️ Excused'}
                                                </td>
                                                <td>{participant.name} ({capitalize(participant.group)})</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // Editable form for adding attendance
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold', color: '#f42f2f' }}>
                                    Emails are only sent to participants whose attendance is EXPLICITLY marked as YES/NO/EXCUSED.
                                </label>
                                <div className="attendance-container">
                                    <div className="attendance-header">
                                        <div className="attendance-header-labels">
                                            <div className="attendance-label">Yes</div>
                                            <div className="attendance-label">No</div>
                                            <div className="attendance-label">Excused</div>
                                            <div className="attendance-label">Attendees</div>
                                            <div className="attendance-label">Excuse Reason</div>
                                        </div>
                                    </div>
                                    <div className="attendance-body">
                                        {availableUsers.map(user => {
                                            const userExcuse = excusesMap[user.email];
                                            return user.email ? (
                                                <div key={user.id} className="attendance-row">
                                                    <div className="attendance-cell checkbox-cell">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={attendanceEmailList[user.email] === 'yes'}
                                                            onChange={() => handleToggleAttendance(user.email, 'yes')}
                                                            disabled={loadingStates.addingAttendance}
                                                        />
                                                    </div>
                                                    <div className="attendance-cell checkbox-cell">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={attendanceEmailList[user.email] === 'no'}
                                                            onChange={() => handleToggleAttendance(user.email, 'no')}
                                                            disabled={loadingStates.addingAttendance}
                                                        />
                                                    </div>
                                                    <div className="attendance-cell checkbox-cell">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={attendanceEmailList[user.email] === 'excused'}
                                                            onChange={() => handleToggleAttendance(user.email, 'excused')}
                                                            disabled={loadingStates.addingAttendance}
                                                        />
                                                    </div>
                                                    <div className="attendance-cell attendee-cell">
                                                        {user.name} ({capitalize(user.group)})
                                                    </div>
                                                    <div className="attendance-cell excuse-cell">
                                                        {userExcuse ? (
                                                            <div className="excuse-content">
                                                                <div className="excuse-reason">
                                                                    {userExcuse.reason}
                                                                </div>
                                                                {userExcuse.createdAt && (
                                                                    <div className="excuse-time">
                                                                        {userExcuse.createdAt.toDate ? 
                                                                            DateTime.fromJSDate(userExcuse.createdAt.toDate()).toFormat('MMM d, yyyy h:mm a') :
                                                                            'Time not available'
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="excuse-empty">—</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => {
                                setShowAttendanceModal(false);
                                setViewingAttendance(false);
                                setExistingParticipants([]);
                                setExcusesMap({});
                            }}
                            disabled={loadingStates.addingAttendance}
                        >
                            Close
                        </button>
                        {!viewingAttendance && (
                            <button 
                                className="btn btn-primary" 
                                onClick={handleUpdateAttendance}
                                disabled={loadingStates.addingAttendance}
                            >
                                {loadingStates.addingAttendance ? 'Updating...' : 'Update Attendance'}
                            </button>
                        )}
                    </ModalFooter>
                </Modal>

            {/* Delete Confirmation Dialog */}
            {deletingMeeting && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        // Only clear deletingMeeting if we're not transitioning to second dialog
                        if (!isTransitioningRef.current) {
                            setDeletingMeeting(null);
                        }
                        isTransitioningRef.current = false;
                    }}
                    title="Delete Meeting"
                    message="Are you sure you want to delete this meeting?"
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={() => {
                        // Mark that we're transitioning to second dialog
                        isTransitioningRef.current = true;
                        // Transition to second dialog
                        setShowEmailConfirm(true);
                        setShowDeleteConfirm(false);
                    }}
                    variant="danger"
                />
            )}

            {/* Email Confirmation Dialog */}
            {deletingMeeting && (
                <ConfirmDialog
                    isOpen={showEmailConfirm}
                    onClose={() => {
                        // "No, Just Delete" - delete without email
                        confirmDeleteMeeting(false);
                    }}
                    title="Send Email Notification"
                    message="Do you want to send email notification for this meeting cancellation?"
                    confirmText="Yes, Send Email"
                    cancelText="No, Just Delete"
                    onConfirm={() => {
                        // "Yes, Send Email" - delete with email
                        confirmDeleteMeeting(true);
                    }}
                />
            )}

            {/* Excuse Modal */}
            <Modal 
                isOpen={showExcuseModal}
                onClose={() => !loadingStates.submittingExcuse && setShowExcuseModal(false)}
            >
                <ModalHeader onClose={() => !loadingStates.submittingExcuse && setShowExcuseModal(false)}>
                    <h3>Submit Excuse</h3>
                </ModalHeader>
                <ModalBody>
                    <form id="excuseForm" onSubmit={(e) => { e.preventDefault(); handleSubmitExcuse(); }}>
                        <div className="form-group">
                            <label htmlFor="excuseReason">Reason for Excuse *</label>
                            <textarea 
                                id="excuseReason" 
                                rows="5" 
                                value={excuseReason}
                                onChange={(e) => setExcuseReason(e.target.value)}
                                placeholder="Please provide a reason for your excuse..."
                                disabled={loadingStates.submittingExcuse}
                                required
                            />
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => {
                            setShowExcuseModal(false);
                            setExcuseReason('');
                            setExcusingMeetingId(null);
                        }}
                        disabled={loadingStates.submittingExcuse}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSubmitExcuse}
                        disabled={loadingStates.submittingExcuse}
                    >
                        {loadingStates.submittingExcuse ? 'Submitting...' : 'Submit Excuse'}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

function MeetingCard({ meeting, userData, onEdit, onDelete, onAddAttendance, onExcuse, isLoading }) {
    const localDateTime = meeting.chicagoDateTime.toLocal();
    const formattedDate = localDateTime.toFormat('LLL d, yyyy');
    const formattedTime = localDateTime.toFormat('h:mm a');
    const timezone = localDateTime.zoneName;
    const endDateTime = localDateTime.plus({ hours: 1 });
    const meetingType = meeting.type === 'admin' ? 'staff' : meeting.type;

    const googleCalendarURL = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        meeting.title
    )}&details=${encodeURIComponent(
        meeting.description || ''
    )}&location=${encodeURIComponent(
        meeting.link || ''
    )}&dates=${localDateTime.toFormat('yyyyMMdd\'T\'HHmmss')}/${endDateTime.toFormat('yyyyMMdd\'T\'HHmmss')}&ctz=${timezone}`;

    // Check if current time is within 1 hour before or after meeting time
    // Ensure both times are in Chicago timezone for accurate comparison
    const now = DateTime.now().setZone('America/Chicago');
    const meetingTime = meeting.chicagoDateTime?.setZone('America/Chicago') || 
                       DateTime.fromFormat(
                           `${meeting.date} ${meeting.time}`, 
                           'yyyy-MM-dd HH:mm',
                           { zone: 'America/Chicago' }
                       );
    const oneHourBefore = meetingTime.minus({ hours: 1 });
    const oneHourAfter = meetingTime.plus({ hours: 1 });
    const canJoin = now >= oneHourBefore && now <= oneHourAfter;

    // Check if current time is 30 minutes or more before meeting time (for excuse button)
    // Excuse can only be submitted 30+ minutes before the meeting
    const thirtyMinutesBefore = meetingTime.minus({ minutes: 30 });
    const canExcuse = !meeting.isPast && now < thirtyMinutesBefore;

    // Check if current time is after meeting time (for attendance button)
    const canAddAttendance = now >= meetingTime;

    const canEdit = userData?.position === 'staff';
    const hasParticipants = meeting.participants && meeting.participants.length > 0;

    return (
        <div className={`meeting-card ${meeting.isPast ? 'past' : ''}`}>
            <div className="meeting-header">
                <div className="meeting-datetime">
                    <span className="material-icons">event</span>
                    <span className="meeting-date">{formattedDate}</span>
                    <span className="meeting-time">{formattedTime}</span>
                </div>
                {!meeting.isPast && meeting.link && isValidUrl(meeting.link) && (
                    <div className="buttons">
                        <a className="btn btn-outline btn-sm button" href={googleCalendarURL} target="_blank" rel="noopener noreferrer">
                            <span className="material-icons">edit_calendar</span>
                            Add to Calendar
                        </a>
                        {canJoin && (
                            <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => joinMeeting(meeting.link, meeting.id)}
                            >
                                <span className="material-icons">video_camera_front</span>
                                Join Meeting
                            </button>
                        )}
                    </div>
                )}
            </div>
            <h4 className="meeting-title">{meeting.title}</h4>
            <p className="meeting-description">{meeting.description}</p>
            <div className="meeting-actions">
                {canEdit && (
                    <div className="meeting-meta">
                        <span className={`meeting-type ${meetingType}`}>
                            {capitalize(meetingType)} Meeting
                        </span>
                    </div>
                )}
                {canExcuse && !meeting.hasExcuse && (
                    <button 
                        className="btn btn-outline" 
                        onClick={() => onExcuse(meeting.id)}
                        disabled={isLoading}
                    >
                        <span className="material-icons">cancel</span>
                        Excuse
                    </button>
                )}
                {(canAddAttendance && (hasParticipants || canEdit)) && (
                    <button 
                        className="btn btn-outline" 
                        onClick={() => onAddAttendance(meeting.id)}
                        disabled={isLoading}
                    >
                        {hasParticipants ? 'View Attendance' : (canEdit ? 'Add Attendance' : 'View Attendance')}
                    </button>
                )}
                {canEdit && (
                    <>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => onEdit(meeting)}
                            disabled={isLoading}
                        >
                            Edit
                        </button>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => onDelete(meeting)}
                            disabled={isLoading}
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
