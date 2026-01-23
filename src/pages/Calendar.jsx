import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../contexts/AuthContext';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { API_ENDPOINTS } from '../config/env';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import '../css/style.css';
import '../css/calendar.css';

export default function Calendar() {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState([]);
    const [icsMeetings, setIcsMeetings] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);

    useEffect(() => {
        async function loadMeetings() {
            setLoading(true);
            try {
                const meetingsRef = collection(db, 'meetings');
                const q = query(meetingsRef, orderBy('date', 'desc'), orderBy('time', 'desc'));
                const meetingsSnap = await getDocs(q);

                const userZone = DateTime.local().zoneName;
                const meetingsList = [];

                for (const meetingDoc of meetingsSnap.docs) {
                    const meeting = meetingDoc.data();
                    // Meeting data is stored in Chicago timezone
                    const chicagoDateTime = DateTime.fromFormat(
                        `${meeting.date} ${meeting.time}`,
                        'yyyy-MM-dd HH:mm',
                        { zone: meeting.timezone || 'America/Chicago' }
                    );
                    const userDateTime = chicagoDateTime.setZone(userZone);

                    meetingsList.push({
                        id: meetingDoc.id,
                        ...meeting,
                        date: userDateTime.toFormat('yyyy-MM-dd'),
                        time: userDateTime.toFormat('h:mm a')
                    });
                }

                // Fetch ICS meetings
                try {
                    const res = await fetch(API_ENDPOINTS.calendar.ics);
                    const icsText = await res.text();
                    
                    // Parse ICS if ICAL library is available
                    if (typeof window !== 'undefined' && window.ICAL) {
                        const jcalData = window.ICAL.parse(icsText);
                        const comp = new window.ICAL.Component(jcalData);
                        const events = comp.getAllSubcomponents("vevent");

                        const icsList = [];
                        for (const event of events) {
                            const vevent = new window.ICAL.Event(event);
                            const start = vevent.startDate.toJSDate();
                            const eventStart = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(userZone);

                            icsList.push({
                                id: vevent.uid || `event-${Math.random().toString(36).substr(2, 9)}`,
                                date: eventStart.toFormat('yyyy-MM-dd'),
                                time: eventStart.toFormat('h:mm a'),
                                timezone: userZone,
                                title: vevent.summary || 'Untitled Event',
                                description: vevent.description || '',
                                link: vevent.location || '',
                                type: 'general',
                                group: 'default'
                            });
                        }
                        setIcsMeetings(icsList);
                    }
                } catch (error) {
                    console.error('Error fetching ICS meetings:', error);
                }

                setMeetings(meetingsList);
            } catch (error) {
                console.error('Error loading calendar:', error);
            } finally {
                setLoading(false);
            }
        }

        loadMeetings();
    }, []);

    const allMeetings = [...meetings, ...icsMeetings];

    const renderCalendar = () => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        const days = [];
        
        // Empty cells for days before month starts
        for (let i = 0; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }
        
        // Days of the month
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateString = date.toISOString().split('T')[0];
            
            const dayMeetings = allMeetings.filter(meeting => meeting.date === dateString);
            
            days.push(
                <div key={day} className="calendar-day">
                    <div className="day-number">{day}</div>
                    <div className="day-events">
                        {dayMeetings.map(meeting => (
                            <div 
                                key={meeting.id} 
                                className="calendar-event"
                                onClick={() => {
                                    setSelectedEvent(meeting);
                                    setShowEventModal(true);
                                }}
                            >
                                <span className="event-time">{meeting.time}</span>
                                <span className="event-title">{meeting.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        
        return days;
    };

    const previousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container calendar-view">
            <div className="page-header">
                <div>
                    <h2>Calendar</h2>
                    <p className="text-medium">View ITCPR events and meetings in one place</p>
                </div>
                <div className="calendar-header">
                    <div className="calendar-nav">
                        <button className="btn btn-outline" onClick={previousMonth}>
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <h2>
                            {monthNames[currentMonth]} {currentYear}
                        </h2>
                        <button className="btn btn-outline" onClick={nextMonth}>
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="calendar-grid">
                <div className="calendar-weekdays">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                </div>
                <div className="calendar-days">
                    {renderCalendar()}
                </div>
            </div>

            {selectedEvent && (
                <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)}>
                    <ModalHeader onClose={() => setShowEventModal(false)}>
                        <h3>{selectedEvent.title}</h3>
                    </ModalHeader>
                    <ModalBody>
                        <p><strong>Date:</strong> {DateTime.fromFormat(selectedEvent.date, 'yyyy-MM-dd').toFormat('d LLLL yyyy')}</p>
                        <p><strong>Time:</strong> {selectedEvent.time}</p>
                        {selectedEvent.group === 'default' ? (
                            <p><strong>Source:</strong> Google Calendar</p>
                        ) : (
                            <p><strong>Description:</strong> {selectedEvent.description || 'No description available'}</p>
                        )}
                        <p><strong>Type:</strong> {
                            selectedEvent.type === 'group' ? 'Group' : 
                            selectedEvent.type === 'admin' ? 'Administrative' : 
                            'General'
                        } Meeting</p>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-primary" onClick={() => setShowEventModal(false)}>
                            Close
                        </button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

