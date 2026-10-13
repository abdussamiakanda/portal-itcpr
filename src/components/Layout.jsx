import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { TopProgress } from './Loading';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { startPortalTimeTracking, stopPortalTimeTracking, trackDailyLogin } from '../utils/gamification';
import { checkReportStatus } from '../utils/reportReminder';
import '../css/layout.css';
import '../css/modal.css';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved ? JSON.parse(saved) : false;
        } catch {
            return false;
        }
    });
    const [showReportReminder, setShowReportReminder] = useState(false);
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        try {
            localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
        } catch {
            // Storage unavailable (private mode); preference just won't persist
        }
    }, [sidebarCollapsed]);

    // Close the mobile drawer with Escape and reset scroll on route change
    useEffect(() => {
        if (!sidebarOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') setSidebarOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [sidebarOpen]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname]);

    // Portal time tracking and daily login
    useEffect(() => {
        if (user) {
            // Track daily login
            trackDailyLogin().catch(error => {
                console.error('Error tracking daily login:', error);
            });

            // Start portal time tracking
            startPortalTimeTracking();

            // Cleanup on unmount
            return () => {
                stopPortalTimeTracking();
            };
        }
    }, [user]);

    // Report reminder: show on all pages for interns who have joined Discord and haven't submitted this month
    useEffect(() => {
        if (!user || !userData) return;
        if (userData.role === 'intern' && userData.discordId) {
            checkReportStatus(userData, user.uid).then(allowReport => {
                if (allowReport) setShowReportReminder(true);
            });
        }
    }, [user, userData]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <>
            <TopProgress />
            <section id="portalSection" className="section-portal">
                <Navbar onMenuToggle={toggleSidebar} />
                <div className="portal-layout">
                    {sidebarOpen && (
                        <div 
                            className="sidebar-backdrop" 
                            onClick={closeSidebar}
                            aria-hidden="true"
                        />
                    )}
                    <Sidebar 
                        isOpen={sidebarOpen} 
                        onClose={closeSidebar}
                        isCollapsed={sidebarCollapsed}
                        onToggleCollapse={toggleSidebarCollapse}
                    />
                    <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                        <div id="contentArea" key={location.pathname} className="page-transition">
                            {children || <Outlet />}
                        </div>
                    </main>
                </div>
            </section>

            {/* Report Reminder – shown on all pages when applicable */}
            <Modal isOpen={showReportReminder} onClose={() => setShowReportReminder(false)}>
                <ModalHeader onClose={() => setShowReportReminder(false)}>
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
                    <button className="btn btn-secondary" onClick={() => setShowReportReminder(false)}>
                        Close
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setShowReportReminder(false);
                            navigate('/report');
                        }}
                    >
                        Complete Report
                    </button>
                </ModalFooter>
            </Modal>
        </>
    );
}

