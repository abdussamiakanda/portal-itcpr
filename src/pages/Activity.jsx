import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../contexts/AuthContext';
import { collection, query, orderBy, getDocs, limit, where, doc, getDoc } from 'firebase/firestore';
import LoadingOverlay from '../components/LoadingOverlay';
import { DateTime } from 'luxon';
import { getUserGamificationStats, getUserBadges, BADGES } from '../utils/gamification';
import * as LucideIcons from 'lucide-react';
import '../css/style.css';
import '../css/activity.css';

function formatActivityDateTime(date) {
    try {
        if (!date) return 'Unknown date';
        
        // Handle Firestore Timestamp
        let dateToFormat = date;
        if (date && typeof date === 'object' && 'toDate' in date) {
            dateToFormat = date.toDate();
        } else if (date && typeof date === 'object' && 'seconds' in date) {
            // Firestore timestamp with seconds property
            dateToFormat = new Date(date.seconds * 1000);
        }
        
        // Try as ISO string first
        if (typeof dateToFormat === 'string') {
            const inputDate = DateTime.fromISO(dateToFormat);
            if (inputDate.isValid) {
                const userTimezone = DateTime.local().zoneName;
                const userDate = inputDate.setZone(userTimezone);
                return userDate.toFormat('LLL d, yyyy') + ' at ' + userDate.toFormat('h:mm a');
            }
        }
        
        // Try as Date object
        const dateObj = dateToFormat instanceof Date ? dateToFormat : new Date(dateToFormat);
        if (!isNaN(dateObj.getTime())) {
            const inputDate = DateTime.fromJSDate(dateObj);
            const userTimezone = DateTime.local().zoneName;
            const userDate = inputDate.setZone(userTimezone);
            return userDate.toFormat('LLL d, yyyy') + ' at ' + userDate.toFormat('h:mm a');
        }
        
        return 'Unknown date';
    } catch (error) {
        console.error('Error formatting activity date:', error);
        return 'Unknown date';
    }
}

export default function Activity() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [badges, setBadges] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [projectsAsContributor, setProjectsAsContributor] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        async function loadActivities() {
            if (!user) return;

            setLoading(true);
            try {
                // Load gamification stats
                const gamificationStats = await getUserGamificationStats(user.uid);
                setStats(gamificationStats);

                // Load badges
                const userBadges = await getUserBadges(user.uid);
                setBadges(userBadges);

                // Load recent point transactions
                const transactionsRef = collection(db, 'users', user.uid, 'pointTransactions');
                const transactionsQuery = query(transactionsRef, orderBy('createdAt', 'desc'), limit(10));
                const transactionsSnap = await getDocs(transactionsQuery);
                const transactionsList = transactionsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRecentTransactions(transactionsList);

                // Count projects where user is a contributor
                if (userData?.group) {
                    const projectsRef = collection(db, 'groups', userData.group, 'projects');
                    const projectsSnap = await getDocs(projectsRef);
                    
                    let contributorCount = 0;
                    for (const projectDoc of projectsSnap.docs) {
                        const contributorsRef = collection(db, 'groups', userData.group, 'projects', projectDoc.id, 'contributors');
                        const contributorsQuery = query(contributorsRef, where('userId', '==', user.uid));
                        const contributorsSnap = await getDocs(contributorsQuery);
                        if (!contributorsSnap.empty) {
                            contributorCount++;
                        }
                    }
                    setProjectsAsContributor(contributorCount);
                }

                // Load leaderboard
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const leaderboardData = [];

                for (const userDoc of usersSnap.docs) {
                    const userId = userDoc.id;
                    const userInfo = userDoc.data();
                    
                    // Get gamification stats for this user
                    const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
                    const statsSnap = await getDoc(statsRef);
                    
                    if (statsSnap.exists()) {
                        const userStats = statsSnap.data();
                        leaderboardData.push({
                            userId,
                            name: userInfo.name || 'Unknown',
                            photoURL: userInfo.photoURL || null,
                            email: userInfo.email || '',
                            totalPoints: userStats.totalPoints || 0,
                            totalPortalTime: userStats.totalPortalTime || 0,
                            totalMeetings: userStats.totalMeetings || 0
                        });
                    }
                }

                // Sort by totalPoints descending
                leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
                
                // Take top 10
                setLeaderboard(leaderboardData.slice(0, 10));
            } catch (error) {
                console.error('Error loading activities:', error);
            } finally {
                setLoading(false);
            }
        }

        loadActivities();
    }, [user, userData]);

    if (loading) {
        return <LoadingOverlay show={true} />;
    }

    const formatPoints = (points) => {
        return new Intl.NumberFormat('en-US').format(points || 0);
    };

    const formatTime = (minutes) => {
        if (!minutes) return '0 min';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    // Helper function to render Lucide icon
    const renderIcon = (iconName, className = '', size = 24) => {
        const IconComponent = LucideIcons[iconName];
        if (!IconComponent) {
            // Fallback to a default icon if icon name not found
            const DefaultIcon = LucideIcons['HelpCircle'];
            return <DefaultIcon className={className} size={size} />;
        }
        return <IconComponent className={className} size={size} />;
    };

    // Helper function to get user initials
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Helper function to get rank badge/medal
    const getRankDisplay = (rank) => {
        if (rank === 1) {
            return renderIcon('Trophy', 'rank-icon rank-first', 24);
        }
        if (rank === 2) {
            return renderIcon('Medal', 'rank-icon rank-second', 24);
        }
        if (rank === 3) {
            return renderIcon('Award', 'rank-icon rank-third', 24);
        }
        return <span className="rank-number-text">#{rank}</span>;
    };

    return (
        <div className="activity-page">
            <div className="activity-hero">
                <div className="hero-content">
                    <h1 className="hero-title">Your Research Journey</h1>
                    <p className="hero-subtitle">Track your progress, earn achievements, and grow as a researcher</p>
                </div>
                {stats && (
                    <div className="hero-stats">
                        <div className="hero-stat-main">
                            <div className="stat-number-animated">{formatPoints(stats.totalPoints)}</div>
                            <div className="stat-label">Total Points</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Gamification Stats */}
            {stats && (
                <div className="activity-stats-grid">
                    <div className="activity-stat-card stat-points" style={{ animationDelay: '0.1s' }}>
                        <div className="stat-card-bg"></div>
                        <div className="stat-card-content">
                            <div className="stat-icon-wrapper">
                                {renderIcon('Star', 'stat-icon', 32)}
                            </div>
                            <div className="stat-info">
                                <div className="stat-value-animated">{formatPoints(stats.totalPoints)}</div>
                                <div className="stat-title">Total Points</div>
                                <div className="stat-description">Earned through research activities</div>
                            </div>
                        </div>
                    </div>

                    <div className="activity-stat-card stat-time" style={{ animationDelay: '0.2s' }}>
                        <div className="stat-card-bg"></div>
                        <div className="stat-card-content">
                            <div className="stat-icon-wrapper">
                                {renderIcon('Clock', 'stat-icon', 32)}
                            </div>
                            <div className="stat-info">
                                <div className="stat-value-animated">{formatTime(stats.totalPortalTime)}</div>
                                <div className="stat-title">Portal Time</div>
                                <div className="stat-description">Active time in the portal</div>
                            </div>
                        </div>
                    </div>

                    <div className="activity-stat-card stat-meetings" style={{ animationDelay: '0.3s' }}>
                        <div className="stat-card-bg"></div>
                        <div className="stat-card-content">
                            <div className="stat-icon-wrapper">
                                {renderIcon('Users', 'stat-icon', 32)}
                            </div>
                            <div className="stat-info">
                                <div className="stat-value-animated">{stats.totalMeetings || 0}</div>
                                <div className="stat-title">Meetings Joined</div>
                                <div className="stat-description">
                                    {stats.onTimeMeetings || 0} on-time, {stats.earlyMeetings || 0} early
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="activity-stat-card stat-projects" style={{ animationDelay: '0.4s' }}>
                        <div className="stat-card-bg"></div>
                        <div className="stat-card-content">
                            <div className="stat-icon-wrapper">
                                {renderIcon('FolderKanban', 'stat-icon', 32)}
                            </div>
                            <div className="stat-info">
                                <div className="stat-value-animated">{projectsAsContributor || 0}</div>
                                <div className="stat-title">Projects as Contributor</div>
                                <div className="stat-description">Contributing to research projects</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Badges Section */}
            {badges.length > 0 && (
                <div className="badges-section">
                    <div className="section-header-animated">
                        <h3 className="section-title">Your Achievements</h3>
                        <div className="badge-count-badge">{badges.length} Badges</div>
                    </div>
                    <div className="badges-grid">
                        {badges.map((badge, index) => (
                            <div 
                                key={badge.id} 
                                className="badge-card-animated"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="badge-glow"></div>
                                <div className="badge-icon-wrapper">
                                    {renderIcon(badge.icon, 'badge-icon', 48)}
                                </div>
                                <div className="badge-info">
                                    <div className="badge-name">{badge.name}</div>
                                    <div className="badge-description">{badge.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Leaderboard Section */}
            {leaderboard.length > 0 && (
                <div className="leaderboard-section">
                    <div className="section-header-animated">
                        <h3 className="section-title">Leaderboard</h3>
                        <div className="leaderboard-subtitle">Top researchers by points</div>
                    </div>
                    <div className="leaderboard-list">
                        {leaderboard.map((entry, index) => {
                            const rank = index + 1;
                            const isCurrentUser = entry.userId === user?.uid;
                            return (
                                <div 
                                    key={entry.userId} 
                                    className={`leaderboard-item-animated ${isCurrentUser ? 'current-user' : ''}`}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="leaderboard-rank">
                                        {getRankDisplay(rank)}
                                    </div>
                                    <div className="leaderboard-avatar-wrapper">
                                        {entry.photoURL ? (
                                            <img 
                                                src={entry.photoURL} 
                                                alt={entry.name}
                                                className="leaderboard-avatar"
                                            />
                                        ) : (
                                            <div className="leaderboard-avatar initials">
                                                {getInitials(entry.name)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="leaderboard-info">
                                        <div className="leaderboard-name">
                                            {entry.name}
                                            {isCurrentUser && <span className="you-badge">You</span>}
                                        </div>
                                        <div className="leaderboard-stats">
                                            <span className="stat-item">
                                                {renderIcon('Star', 'stat-icon-small', 14)}
                                                {formatPoints(entry.totalPoints)} pts
                                            </span>
                                            <span className="stat-item">
                                                {renderIcon('Clock', 'stat-icon-small', 14)}
                                                {formatTime(entry.totalPortalTime)}
                                            </span>
                                            <span className="stat-item">
                                                {renderIcon('Users', 'stat-icon-small', 14)}
                                                {entry.totalMeetings || 0} meetings
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Points Transactions */}
            {recentTransactions.length > 0 && (
                <div className="points-history-section">
                    <div className="section-header-animated">
                        <h3 className="section-title">Recent Points</h3>
                    </div>
                    <div className="points-list">
                        {recentTransactions.map((transaction, index) => (
                            <div 
                                key={transaction.id} 
                                className="points-item-animated"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="points-amount-wrapper">
                                    <div className="points-amount positive">
                                        +{formatPoints(transaction.points)}
                                    </div>
                                    <div className="points-icon">
                                        {renderIcon('Sparkles', 'points-icon-svg', 20)}
                                    </div>
                                </div>
                                <div className="points-details">
                                    <div className="points-reason">{transaction.reason}</div>
                                    <div className="points-date">
                                        {formatActivityDateTime(transaction.createdAt?.toDate?.() || transaction.createdAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

