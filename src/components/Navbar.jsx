import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../css/layout.css';

const apps = [
    { url: 'https://itcpr.org', iconClass: 'fa-solid fa-earth-asia', text: 'Website' },
    { url: 'https://webmail.itcpr.org', iconClass: 'fa-solid fa-envelope', text: 'Webmail' },
    { url: 'https://pay.itcpr.org', iconClass: 'fa-solid fa-credit-card', text: 'Payment' },
    { url: 'https://terminal.itcpr.org', iconClass: 'fa-solid fa-laptop-code', text: 'Terminal' },
    { url: 'https://server.itcpr.org', iconClass: 'fa-solid fa-server', text: 'Server' },
    { url: 'https://library.itcpr.org', iconClass: 'fa-solid fa-book-open-reader', text: 'Library' },
    { url: 'https://cloud.itcpr.org', iconClass: 'fa-solid fa-cloud', text: 'Cloud' },
    { url: 'https://code.itcpr.org', iconClass: 'fa-solid fa-atom', text: 'CodeLab' },
    { url: 'https://jupyter.itcpr.org', iconClass: 'fa-brands fa-python', text: 'JupyterLab' },
    { url: 'https://overleaf.itcpr.org', iconClass: 'fas fa-superscript', text: 'Overleaf' },
    { url: 'https://latex.itcpr.org', iconClass: 'fa-solid fa-file-code', text: 'LaTeX' },
    { url: 'https://buildbox.itcpr.org', iconClass: 'fa-solid fa-gamepad', text: 'BuildBox' },
    { url: 'https://forum.itcpr.org', iconClass: 'fa-solid fa-comments', text: 'Forum' },
    { url: 'https://events.itcpr.org', iconClass: 'fa-solid fa-calendar', text: 'Events' },
    { url: 'https://news.itcpr.org', iconClass: 'fa-solid fa-newspaper', text: 'News' },
    { url: 'https://physics.itcpr.org', iconClass: 'fa-solid fa-gear', text: 'Engine' }
];

const logos = [
    "science", "functions", "device_thermostat", "bolt", "hub", "lightbulb",
    "model_training", "calculate", "public", "analytics", "biotech", "book",
    "developer_board", "query_stats"
];

export default function Navbar({ onMenuToggle }) {
    const { userData, signOutUser } = useAuth();
    const navigate = useNavigate();
    const [appsMenuOpen, setAppsMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [currentLogo, setCurrentLogo] = useState(logos[0]);
    const [scrolled, setScrolled] = useState(false);
    const appsMenuRef = useRef(null);
    const userMenuRef = useRef(null);
    const navRef = useRef(null);

    useEffect(() => {
        setCurrentLogo(logos[Math.floor(Math.random() * logos.length)]);
        const interval = setInterval(() => {
            setCurrentLogo(logos[Math.floor(Math.random() * logos.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (appsMenuRef.current && !appsMenuRef.current.contains(event.target)) {
                setAppsMenuOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        if (appsMenuOpen || userMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [appsMenuOpen, userMenuOpen]);

    if (!userData) return null;

    return (
        <nav className={`nav-bar ${scrolled ? 'scrolled' : ''}`} ref={navRef}>
            <div className="nav-left">
                <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
                    <span className="material-icons">menu</span>
                </button>
                <div className="nav-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
                    <span className="material-icons brand-icon" id="itcpr_logo_top">{currentLogo}</span>
                    <span className="brand-text">ITCPR Portal</span>
                </div>
            </div>
            <div className="nav-right">
                <div className="nav-actions">
                    <div className="apps-wrapper" ref={appsMenuRef}>
                        <button 
                            className={`apps-icon ${appsMenuOpen ? 'active' : ''}`}
                            onClick={() => setAppsMenuOpen(!appsMenuOpen)}
                            aria-label="Apps menu"
                            aria-expanded={appsMenuOpen}
                        >
                            <span className="material-icons">apps</span>
                        </button>
                        <div className={`apps-menu ${appsMenuOpen ? 'active' : ''}`} id="appsMenu">
                            <div className="apps-menu-header">
                                <span className="material-icons">apps</span>
                                <span>Quick Links</span>
                            </div>
                            <div className="apps-grid">
                                {apps.map((app, idx) => (
                                    <a 
                                        key={idx} 
                                        href={app.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="app-link"
                                        onClick={() => setAppsMenuOpen(false)}
                                    >
                                        <i className={app.iconClass}></i>
                                        <span>{app.text}</span>
                                    </a>
                                ))}
                                {userData?.position === 'staff' && (
                                    <a 
                                        href="https://staff.itcpr.org" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="app-link"
                                        onClick={() => setAppsMenuOpen(false)}
                                    >
                                        <i className="fa-solid fa-user-tie"></i>
                                        <span>Staff</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="user-menu-wrapper" ref={userMenuRef}>
                        <button
                            className={`user-avatar-btn ${userMenuOpen ? 'active' : ''}`}
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            aria-label="User menu"
                            aria-expanded={userMenuOpen}
                        >
                            <img 
                                id="userAvatar" 
                                src={userData.photoURL || '/assets/default-avatar.svg'} 
                                alt={userData.name || 'User'} 
                                className="nav-avatar"
                            />
                            <span className={`material-icons chevron-icon ${userMenuOpen ? 'open' : ''}`}>expand_more</span>
                        </button>
                        <div className={`user-dropdown-menu ${userMenuOpen ? 'active' : ''}`}>
                            <div className="user-dropdown-header">
                                <img 
                                    src={userData.photoURL || '/assets/default-avatar.svg'} 
                                    alt={userData.name || 'User'} 
                                    className="dropdown-avatar"
                                />
                                <div className="dropdown-user-info">
                                    <div className="dropdown-user-name">{userData.name}</div>
                                    <div className="dropdown-user-email">{userData.email}</div>
                                </div>
                            </div>
                            <div className="user-dropdown-divider"></div>
                            <div className="user-dropdown-items">
                                <button 
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate('/profile');
                                        setUserMenuOpen(false);
                                    }}
                                >
                                    <span className="material-icons">person</span>
                                    <span>Profile</span>
                                </button>
                                <button 
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate('/activity');
                                        setUserMenuOpen(false);
                                    }}
                                >
                                    <span className="material-icons">history</span>
                                    <span>Activity</span>
                                </button>
                                <button 
                                    className="dropdown-item"
                                    onClick={() => {
                                        signOutUser();
                                        setUserMenuOpen(false);
                                    }}
                                >
                                    <span className="material-icons">logout</span>
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}


