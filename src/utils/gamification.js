import { db, auth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';

// Point values for different activities
export const POINT_VALUES = {
    PORTAL_TIME_5MIN: 1,        // 1 point per 5 minutes in portal
    PORTAL_TIME_30MIN: 10,      // Bonus 10 points for 30 minutes
    PORTAL_TIME_1HOUR: 25,     // Bonus 25 points for 1 hour
    DATABASE_WRITE: 5,          // 5 points per database write
    MEETING_JOIN_ON_TIME: 50,  // 50 points for joining meeting on time
    MEETING_JOIN_EARLY: 30,    // 30 points for joining early (15+ min before)
    MEETING_JOIN_LATE: 20,     // 20 points for joining late (within 15 min after)
    PROJECT_CREATE: 25,        // 25 points for creating a project
    PROJECT_UPDATE: 10,        // 10 points for updating a project
    EVALUATION_SUBMIT: 50,     // 50 points for submitting evaluation
    PAPER_READ: 15,            // 15 points for reading a paper
    PAPER_SUBMIT: 100,         // 100 points for submitting a paper
    ATTENDANCE_MARK: 20,       // 20 points for marking attendance
    DISCORD_CONNECT: 25,       // 25 points for connecting Discord
    PROFILE_UPDATE: 5,         // 5 points for updating profile
    DAILY_LOGIN: 10,           // 10 points for daily login
    WEEKLY_ACTIVE: 50,         // 50 points bonus for weekly activity
    MONTHLY_ACTIVE: 200        // 200 points bonus for monthly activity
};

// Badge definitions
export const BADGES = {
    // Portal Engagement
    FIRST_STEPS: {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Spent 1 hour in the portal',
        icon: 'Footprints',
        pointsRequired: 0,
        condition: (stats) => stats.totalPortalTime >= 60
    },
    DEDICATED: {
        id: 'dedicated',
        name: 'Dedicated Researcher',
        description: 'Spent 10 hours in the portal',
        icon: 'Clock',
        pointsRequired: 0,
        condition: (stats) => stats.totalPortalTime >= 600
    },
    MARATHON: {
        id: 'marathon',
        name: 'Marathon Runner',
        description: 'Spent 50 hours in the portal',
        icon: 'Zap',
        pointsRequired: 0,
        condition: (stats) => stats.totalPortalTime >= 3000
    },
    
    // Meeting Participation
    EARLY_BIRD: {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Joined 5 meetings early',
        icon: 'Sunrise',
        pointsRequired: 0,
        condition: (stats) => stats.earlyMeetings >= 5
    },
    ON_TIME: {
        id: 'on_time',
        name: 'Punctual',
        description: 'Joined 10 meetings on time',
        icon: 'Clock',
        pointsRequired: 0,
        condition: (stats) => stats.onTimeMeetings >= 10
    },
    MEETING_MASTER: {
        id: 'meeting_master',
        name: 'Meeting Master',
        description: 'Joined 25 meetings',
        icon: 'Users',
        pointsRequired: 0,
        condition: (stats) => stats.totalMeetings >= 25
    },
    
    // Research Activities
    PROJECT_LEADER: {
        id: 'project_leader',
        name: 'Project Leader',
        description: 'Created 5 projects',
        icon: 'FolderKanban',
        pointsRequired: 0,
        condition: (stats) => stats.projectsCreated >= 5
    },
    CONTRIBUTOR: {
        id: 'contributor',
        name: 'Active Contributor',
        description: 'Updated 20 projects',
        icon: 'Edit',
        pointsRequired: 0,
        condition: (stats) => stats.projectsUpdated >= 20
    },
    EVALUATOR: {
        id: 'evaluator',
        name: 'Self Evaluator',
        description: 'Submitted 3 evaluations',
        icon: 'FileText',
        pointsRequired: 0,
        condition: (stats) => stats.evaluationsSubmitted >= 3
    },
    SCHOLAR: {
        id: 'scholar',
        name: 'Scholar',
        description: 'Read 10 papers',
        icon: 'BookOpen',
        pointsRequired: 0,
        condition: (stats) => stats.papersRead >= 10
    },
    PUBLISHER: {
        id: 'publisher',
        name: 'Publisher',
        description: 'Submitted a paper',
        icon: 'FileCheck',
        pointsRequired: 0,
        condition: (stats) => stats.papersSubmitted >= 1
    },
    
    // Points Milestones
    BRONZE: {
        id: 'bronze',
        name: 'Bronze Researcher',
        description: 'Earned 500 points',
        icon: 'Award',
        pointsRequired: 500,
        condition: (stats) => stats.totalPoints >= 500
    },
    SILVER: {
        id: 'silver',
        name: 'Silver Researcher',
        description: 'Earned 1,000 points',
        icon: 'Award',
        pointsRequired: 1000,
        condition: (stats) => stats.totalPoints >= 1000
    },
    GOLD: {
        id: 'gold',
        name: 'Gold Researcher',
        description: 'Earned 2,500 points',
        icon: 'Award',
        pointsRequired: 2500,
        condition: (stats) => stats.totalPoints >= 2500
    },
    PLATINUM: {
        id: 'platinum',
        name: 'Platinum Researcher',
        description: 'Earned 5,000 points',
        icon: 'Gem',
        pointsRequired: 5000,
        condition: (stats) => stats.totalPoints >= 5000
    },
    
    // Consistency
    DAILY_LOGIN_7: {
        id: 'daily_login_7',
        name: 'Week Warrior',
        description: 'Logged in 7 days in a row',
        icon: 'Calendar',
        pointsRequired: 0,
        condition: (stats) => stats.consecutiveDays >= 7
    },
    DAILY_LOGIN_30: {
        id: 'daily_login_30',
        name: 'Monthly Champion',
        description: 'Logged in 30 days in a row',
        icon: 'CalendarCheck',
        pointsRequired: 0,
        condition: (stats) => stats.consecutiveDays >= 30
    }
};

/**
 * Get or create user gamification stats
 */
export async function getUserGamificationStats(userId) {
    try {
        // Ensure user is authenticated and can only access their own stats
        if (!auth.currentUser) {
            console.warn('User not authenticated, cannot get gamification stats');
            return null;
        }
        
        // Only allow users to access their own stats
        if (userId !== auth.currentUser.uid) {
            console.warn('User can only access their own gamification stats');
            return null;
        }
        
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        const statsSnap = await getDoc(statsRef);
        
        if (statsSnap.exists()) {
            return statsSnap.data();
        }
        
        // Initialize stats
        const initialStats = {
            totalPoints: 0,
            totalPortalTime: 0, // in minutes
            lastActiveTime: null,
            lastLoginDate: null,
            consecutiveDays: 0,
            totalMeetings: 0,
            onTimeMeetings: 0,
            earlyMeetings: 0,
            lateMeetings: 0,
            projectsCreated: 0,
            projectsUpdated: 0,
            evaluationsSubmitted: 0,
            papersRead: 0,
            papersSubmitted: 0,
            databaseWrites: 0,
            badges: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        await setDoc(statsRef, initialStats);
        return initialStats;
    } catch (error) {
        // Handle permission errors specifically
        if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
            console.warn('Permission denied accessing gamification stats. This may be due to Firestore security rules.');
        } else {
            console.error('Error getting gamification stats:', error);
        }
        return null;
    }
}

/**
 * Award points to user
 */
export async function awardPoints(userId, points, reason, metadata = {}) {
    try {
        if (!userId || !auth.currentUser || userId !== auth.currentUser.uid) {
            return;
        }
        
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        const statsSnap = await getDoc(statsRef);
        
        if (!statsSnap.exists()) {
            await getUserGamificationStats(userId);
        }
        
        await updateDoc(statsRef, {
            totalPoints: increment(points),
            updatedAt: serverTimestamp()
        });
        
        // Log point transaction
        const transactionsRef = collection(db, 'users', userId, 'pointTransactions');
        await addDoc(transactionsRef, {
            points,
            reason,
            metadata,
            createdAt: serverTimestamp()
        });
        
        // Check for new badges
        await checkAndAwardBadges(userId);
        
        return true;
    } catch (error) {
        console.error('Error awarding points:', error);
        return false;
    }
}

/**
 * Track portal time spent
 */
let portalTimeTracker = {
    startTime: null,
    intervalId: null,
    lastCheckpoint: null,
    sessionStartTime: null
};

const PORTAL_TIME_STORAGE_KEY = 'portal_time_tracker';
const MAX_SESSION_GAP = 30 * 60 * 1000; // 30 minutes - if gap is larger, start new session

/**
 * Save tracking state to localStorage
 */
function saveTrackingState() {
    if (!auth.currentUser) return;
    
    const state = {
        userId: auth.currentUser.uid,
        sessionStartTime: portalTimeTracker.sessionStartTime || Date.now(),
        lastCheckpoint: portalTimeTracker.lastCheckpoint || Date.now(),
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(PORTAL_TIME_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving tracking state:', error);
    }
}

/**
 * Load tracking state from localStorage
 */
function loadTrackingState() {
    if (!auth.currentUser) return null;
    
    try {
        const stored = localStorage.getItem(PORTAL_TIME_STORAGE_KEY);
        if (!stored) return null;
        
        const state = JSON.parse(stored);
        
        // Verify it's for the current user
        if (state.userId !== auth.currentUser.uid) {
            localStorage.removeItem(PORTAL_TIME_STORAGE_KEY);
            return null;
        }
        
        // Check if session is still valid (not too old)
        const timeSinceLastUpdate = Date.now() - state.timestamp;
        if (timeSinceLastUpdate > MAX_SESSION_GAP) {
            // Session expired, start fresh
            localStorage.removeItem(PORTAL_TIME_STORAGE_KEY);
            return null;
        }
        
        return state;
    } catch (error) {
        console.error('Error loading tracking state:', error);
        return null;
    }
}

/**
 * Process accumulated time from previous session
 */
async function processAccumulatedTime() {
    if (!auth.currentUser) return;
    
    const savedState = loadTrackingState();
    if (!savedState) return;
    
    const now = Date.now();
    const timeSinceLastCheckpoint = now - savedState.lastCheckpoint;
    const minutesPassed = Math.floor(timeSinceLastCheckpoint / 1000 / 60);
    
    // Only process if at least 1 minute passed (to avoid processing tiny gaps)
    if (minutesPassed >= 1) {
        // Cap at reasonable amount (e.g., max 30 minutes) to prevent abuse
        const minutesToProcess = Math.min(minutesPassed, 30);
        
        if (minutesToProcess >= 5) {
            const minutesToAward = Math.floor(minutesToProcess / 5) * 5;
            
            // Award points for accumulated time
            await awardPoints(
                auth.currentUser.uid,
                POINT_VALUES.PORTAL_TIME_5MIN * (minutesToAward / 5),
                'Portal time spent',
                { minutes: minutesToAward, accumulated: true }
            );
            
            // Update total portal time
            const statsRef = doc(db, 'users', auth.currentUser.uid, 'gamification', 'stats');
            await updateDoc(statsRef, {
                totalPortalTime: increment(minutesToAward),
                lastActiveTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            // Check for milestones
            const stats = await getUserGamificationStats(auth.currentUser.uid);
            if (stats.totalPortalTime % 30 === 0 && stats.totalPortalTime > 0) {
                await awardPoints(
                    auth.currentUser.uid,
                    POINT_VALUES.PORTAL_TIME_30MIN,
                    '30 minutes milestone',
                    { milestone: '30min' }
                );
            }
            if (stats.totalPortalTime % 60 === 0 && stats.totalPortalTime > 0) {
                await awardPoints(
                    auth.currentUser.uid,
                    POINT_VALUES.PORTAL_TIME_1HOUR,
                    '1 hour milestone',
                    { milestone: '1hour' }
                );
            }
        }
    }
}

export async function startPortalTimeTracking() {
    if (portalTimeTracker.intervalId) return;
    
    if (!auth.currentUser) return;
    
    // Process any accumulated time from previous session
    await processAccumulatedTime();
    
    // Initialize or resume tracking
    const savedState = loadTrackingState();
    if (savedState) {
        // Resume existing session
        portalTimeTracker.sessionStartTime = savedState.sessionStartTime;
        portalTimeTracker.lastCheckpoint = savedState.lastCheckpoint;
    } else {
        // Start new session
        portalTimeTracker.sessionStartTime = Date.now();
        portalTimeTracker.lastCheckpoint = Date.now();
        saveTrackingState();
    }
    
    portalTimeTracker.startTime = Date.now();
    
    // Check every minute
    portalTimeTracker.intervalId = setInterval(async () => {
        if (!auth.currentUser) {
            stopPortalTimeTracking();
            return;
        }
        
        const now = Date.now();
        const timeSpent = Math.floor((now - portalTimeTracker.lastCheckpoint) / 1000 / 60); // minutes
        
        if (timeSpent >= 5) {
            const minutesToAward = Math.floor(timeSpent / 5) * 5;
            portalTimeTracker.lastCheckpoint = now - ((timeSpent % 5) * 60 * 1000);
            
            // Save state before processing
            saveTrackingState();
            
            // Award points for time spent
            await awardPoints(
                auth.currentUser.uid,
                POINT_VALUES.PORTAL_TIME_5MIN * (minutesToAward / 5),
                'Portal time spent',
                { minutes: minutesToAward }
            );
            
            // Update total portal time
            const statsRef = doc(db, 'users', auth.currentUser.uid, 'gamification', 'stats');
            await updateDoc(statsRef, {
                totalPortalTime: increment(minutesToAward),
                lastActiveTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            // Check for time-based bonuses
            const stats = await getUserGamificationStats(auth.currentUser.uid);
            if (stats.totalPortalTime % 30 === 0 && stats.totalPortalTime > 0) {
                await awardPoints(
                    auth.currentUser.uid,
                    POINT_VALUES.PORTAL_TIME_30MIN,
                    '30 minutes milestone',
                    { milestone: '30min' }
                );
            }
            if (stats.totalPortalTime % 60 === 0 && stats.totalPortalTime > 0) {
                await awardPoints(
                    auth.currentUser.uid,
                    POINT_VALUES.PORTAL_TIME_1HOUR,
                    '1 hour milestone',
                    { milestone: '1hour' }
                );
            }
        } else {
            // Update checkpoint even if not awarding points yet
            saveTrackingState();
        }
    }, 60000); // Check every minute
    
    // Also save state periodically (every 30 seconds) to ensure we don't lose progress
    setInterval(() => {
        if (auth.currentUser && portalTimeTracker.lastCheckpoint) {
            saveTrackingState();
        }
    }, 30000);
    
    // Save state when page is about to unload
    window.addEventListener('beforeunload', () => {
        saveTrackingState();
    });
}

export function stopPortalTimeTracking() {
    if (portalTimeTracker.intervalId) {
        clearInterval(portalTimeTracker.intervalId);
        portalTimeTracker.intervalId = null;
    }
    
    // Save final state before stopping
    saveTrackingState();
}

/**
 * Track meeting join with time validation
 */
export async function trackMeetingJoin(meetingId, meetingDateTime, meetingLink) {
    try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const now = DateTime.now();
        
        // Parse meeting datetime
        let meetingTime;
        if (typeof meetingDateTime === 'string') {
            meetingTime = DateTime.fromISO(meetingDateTime);
        } else if (meetingDateTime.date && meetingDateTime.time) {
            meetingTime = DateTime.fromFormat(
                `${meetingDateTime.date} ${meetingDateTime.time}`,
                'yyyy-MM-dd HH:mm',
                { zone: meetingDateTime.timezone || 'America/Chicago' }
            );
        } else {
            meetingTime = DateTime.fromJSDate(meetingDateTime);
        }
        
        if (!meetingTime.isValid) {
            console.error('Invalid meeting time');
            return false;
        }
        
        const diffMinutes = Math.floor(meetingTime.diff(now, 'minutes').minutes);
        
        let points = 0;
        let reason = '';
        let meetingType = '';
        
        // Determine points based on timing
        if (diffMinutes >= 15) {
            // Early (15+ minutes before)
            points = POINT_VALUES.MEETING_JOIN_EARLY;
            reason = 'Joined meeting early';
            meetingType = 'early';
        } else if (diffMinutes >= -15) {
            // On time (within 15 minutes before or after)
            points = POINT_VALUES.MEETING_JOIN_ON_TIME;
            reason = 'Joined meeting on time';
            meetingType = 'on_time';
        } else {
            // Late (more than 15 minutes after)
            points = POINT_VALUES.MEETING_JOIN_LATE;
            reason = 'Joined meeting late';
            meetingType = 'late';
        }
        
        // Award points
        await awardPoints(userId, points, reason, {
            meetingId,
            meetingType,
            diffMinutes
        });
        
        // Update meeting stats
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        await updateDoc(statsRef, {
            totalMeetings: increment(1),
            [`${meetingType}Meetings`]: increment(1),
            updatedAt: serverTimestamp()
        });
        
        // Check for badges
        await checkAndAwardBadges(userId);
        
        return true;
    } catch (error) {
        console.error('Error tracking meeting join:', error);
        return false;
    }
}

/**
 * Track database write
 */
export async function trackDatabaseWrite(action, entityType, entityId) {
    try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        
        await awardPoints(
            userId,
            POINT_VALUES.DATABASE_WRITE,
            `Database ${action}: ${entityType}`,
            { entityType, entityId, action }
        );
        
        // Update stats
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        await updateDoc(statsRef, {
            databaseWrites: increment(1),
            updatedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error tracking database write:', error);
        return false;
    }
}

/**
 * Track project creation
 */
export async function trackProjectCreate(projectId) {
    try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        
        await awardPoints(
            userId,
            POINT_VALUES.PROJECT_CREATE,
            'Created project',
            { projectId }
        );
        
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        await updateDoc(statsRef, {
            projectsCreated: increment(1),
            updatedAt: serverTimestamp()
        });
        
        await checkAndAwardBadges(userId);
        return true;
    } catch (error) {
        console.error('Error tracking project create:', error);
        return false;
    }
}

/**
 * Track project update
 */
export async function trackProjectUpdate(projectId) {
    try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        
        await awardPoints(
            userId,
            POINT_VALUES.PROJECT_UPDATE,
            'Updated project',
            { projectId }
        );
        
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        await updateDoc(statsRef, {
            projectsUpdated: increment(1),
            updatedAt: serverTimestamp()
        });
        
        await checkAndAwardBadges(userId);
        return true;
    } catch (error) {
        console.error('Error tracking project update:', error);
        return false;
    }
}

/**
 * Track evaluation submission
 */
export async function trackEvaluationSubmit(evaluationId) {
    try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        
        await awardPoints(
            userId,
            POINT_VALUES.EVALUATION_SUBMIT,
            'Submitted evaluation',
            { evaluationId }
        );
        
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        await updateDoc(statsRef, {
            evaluationsSubmitted: increment(1),
            updatedAt: serverTimestamp()
        });
        
        await checkAndAwardBadges(userId);
        return true;
    } catch (error) {
        console.error('Error tracking evaluation submit:', error);
        return false;
    }
}

// Track daily login state to prevent duplicate calls
let dailyLoginTracking = {
    inProgress: false,
    lastChecked: null
};

/**
 * Track daily login
 */
export async function trackDailyLogin() {
    try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const today = DateTime.now().toISODate();
        
        // Prevent concurrent calls for the same day
        if (dailyLoginTracking.inProgress) {
            return false;
        }
        
        // Check if we already processed today
        if (dailyLoginTracking.lastChecked === today) {
            return false;
        }
        
        dailyLoginTracking.inProgress = true;
        
        try {
            const stats = await getUserGamificationStats(userId);
            
            // Handle case where stats couldn't be retrieved
            if (!stats) {
                dailyLoginTracking.inProgress = false;
                return false;
            }
            
            // Double-check if already logged in today (in case of race condition)
            if (stats.lastLoginDate === today) {
                dailyLoginTracking.lastChecked = today;
                dailyLoginTracking.inProgress = false;
                return false;
            }
            
            // Check consecutive days
            const yesterday = DateTime.now().minus({ days: 1 }).toISODate();
            let consecutiveDays = 1;
            
            if (stats.lastLoginDate === yesterday) {
                consecutiveDays = (stats.consecutiveDays || 0) + 1;
            }
            
            // Update stats FIRST to prevent race conditions
            const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
            await updateDoc(statsRef, {
                lastLoginDate: today,
                consecutiveDays,
                updatedAt: serverTimestamp()
            });
            
            // Mark as checked before awarding points
            dailyLoginTracking.lastChecked = today;
            
            // Award daily login points
            await awardPoints(
                userId,
                POINT_VALUES.DAILY_LOGIN,
                'Daily login',
                { date: today }
            );
            
            await checkAndAwardBadges(userId);
            return true;
        } finally {
            dailyLoginTracking.inProgress = false;
        }
    } catch (error) {
        console.error('Error tracking daily login:', error);
        dailyLoginTracking.inProgress = false;
        return false;
    }
}

/**
 * Check and award badges based on stats
 */
export async function checkAndAwardBadges(userId) {
    try {
        const stats = await getUserGamificationStats(userId);
        
        // Handle case where stats couldn't be retrieved
        if (!stats) {
            return [];
        }
        
        const currentBadges = stats.badges || [];
        const newBadges = [];
        
        // Check each badge
        for (const [key, badge] of Object.entries(BADGES)) {
            // Skip if already earned
            if (currentBadges.includes(badge.id)) {
                continue;
            }
            
            // Check if badge condition is met
            if (badge.condition(stats)) {
                newBadges.push(badge.id);
                
                // Log badge award
                const badgesRef = collection(db, 'users', userId, 'earnedBadges');
                await addDoc(badgesRef, {
                    badgeId: badge.id,
                    badgeName: badge.name,
                    earnedAt: serverTimestamp()
                });
            }
        }
        
        // Update stats with new badges
        if (newBadges.length > 0) {
            const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
            await updateDoc(statsRef, {
                badges: [...currentBadges, ...newBadges],
                updatedAt: serverTimestamp()
            });
        }
        
        return newBadges;
    } catch (error) {
        console.error('Error checking badges:', error);
        return [];
    }
}

/**
 * Get user badges
 */
export async function getUserBadges(userId) {
    try {
        const stats = await getUserGamificationStats(userId);
        
        // Handle case where stats couldn't be retrieved
        if (!stats) {
            return [];
        }
        
        const badgeIds = stats.badges || [];
        
        return badgeIds.map(badgeId => {
            for (const badge of Object.values(BADGES)) {
                if (badge.id === badgeId) {
                    return badge;
                }
            }
            return null;
        }).filter(badge => badge !== null);
    } catch (error) {
        console.error('Error getting user badges:', error);
        return [];
    }
}

