import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import LoadingOverlay from './LoadingOverlay';
import { useAuth } from '../contexts/AuthContext';
import { startPortalTimeTracking, stopPortalTimeTracking, trackDailyLogin } from '../utils/gamification';
import '../css/layout.css';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });
    const { loading, user } = useAuth();

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

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
            <LoadingOverlay show={loading} />
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
                        <div id="contentArea">
                            {children || <Outlet />}
                        </div>
                    </main>
                </div>
            </section>
        </>
    );
}

