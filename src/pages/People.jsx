import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../contexts/AuthContext';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { capitalize } from '../utils/helpers';
import { DateTime } from 'luxon';
import LoadingOverlay from '../components/LoadingOverlay';
import { useToast } from '../components/Toast';
import '../css/people.css';
import '../css/dashboard.css';
import '../css/projects.css';

export default function People() {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Load groups
                const groupsRef = collection(db, 'groups');
                const groupsSnap = await getDocs(groupsRef);
                const groupsList = groupsSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name || capitalize(doc.id)
                }));
                setGroups(groupsList);

                // Load users
                const usersRef = collection(db, 'users');
                const usersQuery = query(usersRef, orderBy('name', 'asc'));
                const usersSnap = await getDocs(usersQuery);
                
                const roleOrder = {
                    lead: 1,
                    supervisor: 2,
                    member: 3,
                    intern: 4,
                    none: 5
                };

                const usersList = usersSnap.docs
                    .map(userDoc => ({
                        id: userDoc.id,
                        ...userDoc.data()
                    }))
                    .filter(user => (user.name && user.email) || user.role === 'none')
                    .sort((a, b) => {
                        const roleA = roleOrder[a.role] || 6;
                        const roleB = roleOrder[b.role] || 6;
                        if (roleA !== roleB) return roleA - roleB;

                        // For same roles, order by join date (createdAt)
                        const createdA = a.createdAt?.toDate?.() || new Date(0);
                        const createdB = b.createdAt?.toDate?.() || new Date(0);
                        const dateDiff = createdA.getTime() - createdB.getTime();
                        if (dateDiff !== 0) return dateDiff;

                        // If same join date, fall back to name
                        const nameA = a.name?.toLowerCase?.() || '';
                        const nameB = b.name?.toLowerCase?.() || '';
                        return nameA.localeCompare(nameB);
                    });

                setUsers(usersList);
                setFilteredUsers(usersList);
            } catch (error) {
                console.error('Error loading users:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    useEffect(() => {
        let filtered = users;

        // Apply group filter
        if (groupFilter !== 'all') {
            filtered = filtered.filter(user => user.group === groupFilter);
        }

        // Apply role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(user => 
                user.name?.toLowerCase().includes(term) ||
                user.email?.toLowerCase().includes(term) ||
                user.group?.toLowerCase().includes(term)
            );
        }

        setFilteredUsers(filtered);
    }, [users, searchTerm, groupFilter, roleFilter]);

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h2>ITCPR Members</h2>
                    <p className="text-medium">View all {users.length} users across research groups</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-container">
                <div className="search-bar">
                    <span className="material-icons">search</span>
                    <input 
                        type="text" 
                        id="memberSearch" 
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-buttons">
                    <select 
                        id="groupFilter" 
                        className="btn btn-outline" 
                        style={{ appearance: 'auto', outline: 'none', paddingLeft: '1rem' }}
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                    >
                        <option value="all">All Groups</option>
                        {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                    <select 
                        id="roleFilter" 
                        className="btn btn-outline" 
                        style={{ appearance: 'auto', outline: 'none', paddingLeft: '1rem' }}
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        <option value="lead">Lead</option>
                        <option value="member">Member</option>
                        <option value="intern">Intern</option>
                    </select>
                </div>
            </div>

            {/* Users Grid */}
            <div className="people-grid">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <PeopleCard key={user.id} user={user} userData={userData} />
                    ))
                ) : (
                    <div className="empty-state">
                        <span className="material-icons">group</span>
                        <p>No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function PeopleCard({ user, userData }) {
    const toast = useToast();
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef(null);
    const date = user.createdAt?.toDate?.();
    const month = date?.toLocaleString('default', { month: 'long' });
    const year = date?.getFullYear();

    const handleCopyEmail = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            await navigator.clipboard.writeText(user.email);
            setCopied(true);
            toast.success('Email copied to clipboard');
            
            // Clear any existing timeout
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
            
            // Reset to copy icon after 2 seconds
            copyTimeoutRef.current = setTimeout(() => {
                setCopied(false);
            }, 3000);
        } catch (error) {
            console.error('Failed to copy email:', error);
            toast.error('Failed to copy email');
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    // Format last login time
    const formatLastLogin = () => {
        if (!user.lastLogin) {
            return 'Never';
        }

        try {
            let lastLoginDate;
            if (user.lastLogin?.toDate) {
                lastLoginDate = user.lastLogin.toDate();
            } else if (user.lastLogin?.seconds) {
                lastLoginDate = new Date(user.lastLogin.seconds * 1000);
            } else if (user.lastLogin instanceof Date) {
                lastLoginDate = user.lastLogin;
            } else {
                return 'Never';
            }

            const loginDateTime = DateTime.fromJSDate(lastLoginDate);
            const now = DateTime.now();
            const diff = now.diff(loginDateTime, ['days', 'hours', 'minutes']);

            // Show relative time if less than 7 days ago
            if (diff.days < 1) {
                if (diff.hours < 1) {
                    const mins = Math.floor(diff.minutes);
                    return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
                }
                const hours = Math.floor(diff.hours);
                return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
            } else if (diff.days < 7) {
                const days = Math.floor(diff.days);
                return days === 1 ? '1 day ago' : `${days} days ago`;
            }

            // Show formatted date for older logins
            const userTimezone = DateTime.local().zoneName;
            const localDateTime = loginDateTime.setZone(userTimezone);
            return localDateTime.toFormat('LLL d, yyyy \'at\' h:mm a');
        } catch (error) {
            console.error('Error formatting last login:', error);
            return 'Unknown';
        }
    };

    return (
        <div 
            className={`people-card ${userData?.position === 'staff' && user.status === 'flagged' ? 'flagged' : ''}`}
            data-role={user.role}
            data-group={user.group || 'none'}
            data-name={user.name}
        >
            <div className="people-header">
                <div className="people-avatar">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} />
                    ) : (
                        user.name?.charAt(0).toUpperCase() || '?'
                    )}
                </div>
                <div className="people-info">
                    <h4 className="people-name">{user.name || 'Unknown'}</h4>
                    <span className="people-role">
                        {capitalize(user.role || 'member')}, {capitalize(user.group || 'none')} Group
                    </span>
                </div>
            </div>
            <div className="people-details">
                <div className="people-detail-item">
                    <span className="material-icons">mail</span>
                    <span className="email-wrapper">
                        <a href={`mailto:${user.email}`} target="_blank" rel="noopener noreferrer">
                            {user.email}
                        </a>
                        <button 
                            className="copy-email-btn"
                            onClick={handleCopyEmail}
                            title={copied ? "Copied!" : "Copy email"}
                            aria-label="Copy email to clipboard"
                        >
                            <span className="material-icons">{copied ? 'check' : 'content_copy'}</span>
                        </button>
                    </span>
                </div>
                {user.discordId && (
                    <div className="people-detail-item">
                        <span className="material-icons">discord</span>
                        <span>
                            <a href={`https://discordapp.com/users/${user.discordId}`} target="_blank" rel="noopener noreferrer">
                                {user.discordUsername || 'Discord'}
                            </a>
                        </span>
                    </div>
                )}
                {date && (
                    <div className="people-detail-item">
                        <span className="material-icons">schedule</span>
                        <span>Joined on {month} {year}</span>
                    </div>
                )}
                <div className="people-detail-item">
                    <span className="material-icons">timer</span>
                    <span>Last login: {formatLastLogin()}</span>
                </div>
            </div>
        </div>
    );
}

