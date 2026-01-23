import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { capitalize } from '../utils/helpers';
import '../css/layout.css';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!userData) return null;

    const userType = userData.type;
    const userRole = userData.role;
    const userStaff = userData?.position === 'staff';

    const menuItems = [
        { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/group', icon: 'meeting_room', label: capitalize(userData.group) },
        { path: '/projects', icon: 'engineering', label: 'Projects' },
        { path: '/courses', icon: 'school', label: 'Courses' },
        { path: '/meetings', icon: 'event', label: 'Meetings' },
        { path: '/people', icon: 'people', label: 'People' },
        { path: '/guides', icon: 'route', label: 'Guides' },
        { path: '/tools', icon: 'architecture', label: 'Tools' },
        { path: '/calendar', icon: 'calendar_month', label: 'Calendar' },
    ];

    if (userRole === 'intern' || userType === 'manager' || userType === 'admin') {
        menuItems.push({ path: '/report', icon: 'rate_review', label: 'Report' });
    }

    const handleMenuClick = (item) => {
        if (item.external) {
            window.open(item.path, '_blank');
        } else {
            navigate(item.path);
            if (window.innerWidth <= 768) {
                onClose();
            }
        }
    };

    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/' || location.pathname === '/dashboard';
        }
        if (path.startsWith('http')) {
            return false;
        }
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleMouseEnter = (e) => {
        if (!isCollapsed) return;
        const menuItem = e.currentTarget;
        const rect = menuItem.getBoundingClientRect();
        const tooltip = menuItem.querySelector('::after');
        if (menuItem) {
            const top = rect.top + rect.height / 2;
            menuItem.style.setProperty('--tooltip-top', `${top}px`);
        }
    };

    return (
        <aside className={`sidebar ${isOpen ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-content">
                <ul className="sidebar-menu" id="sidebarMenu">
                    {menuItems.map((item) => (
                        <li 
                            key={item.path} 
                            className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                            data-tooltip={isCollapsed ? item.label : ''}
                            onMouseEnter={handleMouseEnter}
                        >
                            <a 
                                href={item.external ? item.path : '#'} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleMenuClick(item);
                                }}
                            >
                                <span className="material-icons">{item.icon}</span>
                                <span className="menu-label">{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
                <div className="sidebar-footer">
                    <button 
                        className="sidebar-toggle-btn"
                        onClick={onToggleCollapse}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <span className="material-icons">
                            {isCollapsed ? 'chevron_right' : 'chevron_left'}
                        </span>
                        {!isCollapsed && <span className="toggle-text">Collapse</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}


