# Gamification System Documentation

## Overview

The ITCPR Portal includes a comprehensive gamification system designed to encourage research engagement, consistent participation, and active contribution to the research community. Users earn points and badges for various activities related to research work, portal usage, and collaboration.

**Note**: All badges use Lucide React icons instead of emojis for a consistent, professional appearance.

## Features

### Points System

Users accumulate points through various activities. Points are tracked in real-time and stored in Firestore under each user's gamification profile.

### Badges System

Badges are awarded automatically when users meet specific criteria. Badges represent achievements in different categories:
- Portal Engagement
- Meeting Participation
- Research Activities
- Points Milestones
- Consistency

## Point Values

### Portal Time
- **5 minutes**: 1 point (awarded every 5 minutes of active portal usage)
- **30 minutes milestone**: 10 bonus points
- **1 hour milestone**: 25 bonus points

### Database Activities
- **Database write**: 5 points (any write operation to Firestore)
- **Project creation**: 25 points
- **Project update**: 10 points
- **Evaluation submission**: 50 points

### Meeting Participation
- **Join on time** (within 15 minutes before/after meeting time): 50 points
- **Join early** (15+ minutes before meeting): 30 points
- **Join late** (more than 15 minutes after meeting): 20 points

### Other Activities
- **Daily login**: 10 points (once per day)
- **Discord connection**: 25 points
- **Profile update**: 5 points
- **Paper read**: 15 points
- **Paper submission**: 100 points
- **Attendance marking**: 20 points

### Bonus Points
- **Weekly active**: 50 bonus points (for consistent weekly activity)
- **Monthly active**: 200 bonus points (for consistent monthly activity)

## Badges

### Portal Engagement Badges

#### First Steps (Footprints icon)
- **Description**: Spent 1 hour in the portal
- **Requirement**: 60 minutes of total portal time
- **Icon**: Lucide `Footprints`

#### Dedicated Researcher (Clock icon)
- **Description**: Spent 10 hours in the portal
- **Requirement**: 600 minutes of total portal time
- **Icon**: Lucide `Clock`

#### Marathon Runner (Zap icon)
- **Description**: Spent 50 hours in the portal
- **Requirement**: 3,000 minutes of total portal time
- **Icon**: Lucide `Zap`

### Meeting Participation Badges

#### Early Bird (Sunrise icon)
- **Description**: Joined 5 meetings early (15+ minutes before start)
- **Requirement**: 5 early meeting joins
- **Icon**: Lucide `Sunrise`

#### Punctual (Clock icon)
- **Description**: Joined 10 meetings on time
- **Requirement**: 10 on-time meeting joins
- **Icon**: Lucide `Clock`

#### Meeting Master (Users icon)
- **Description**: Joined 25 meetings
- **Requirement**: 25 total meeting joins
- **Icon**: Lucide `Users`

### Research Activity Badges

#### Project Leader (FolderKanban icon)
- **Description**: Created 5 projects
- **Requirement**: 5 projects created
- **Icon**: Lucide `FolderKanban`

#### Active Contributor (Edit icon)
- **Description**: Updated 20 projects
- **Requirement**: 20 project updates
- **Icon**: Lucide `Edit`

#### Self Evaluator (FileText icon)
- **Description**: Submitted 3 evaluations
- **Requirement**: 3 evaluations submitted
- **Icon**: Lucide `FileText`

#### Scholar (BookOpen icon)
- **Description**: Read 10 papers
- **Requirement**: 10 papers read
- **Icon**: Lucide `BookOpen`

#### Publisher (FileCheck icon)
- **Description**: Submitted a paper
- **Requirement**: 1 paper submitted
- **Icon**: Lucide `FileCheck`

### Points Milestone Badges

#### Bronze Researcher (Award icon)
- **Description**: Earned 500 points
- **Requirement**: 500 total points
- **Icon**: Lucide `Award`

#### Silver Researcher (Award icon)
- **Description**: Earned 1,000 points
- **Requirement**: 1,000 total points
- **Icon**: Lucide `Award`

#### Gold Researcher (Award icon)
- **Description**: Earned 2,500 points
- **Requirement**: 2,500 total points
- **Icon**: Lucide `Award`

#### Platinum Researcher (Gem icon)
- **Description**: Earned 5,000 points
- **Requirement**: 5,000 total points
- **Icon**: Lucide `Gem`

### Consistency Badges

#### Week Warrior (Calendar icon)
- **Description**: Logged in 7 days in a row
- **Requirement**: 7 consecutive days
- **Icon**: Lucide `Calendar`

#### Monthly Champion (CalendarCheck icon)
- **Description**: Logged in 30 days in a row
- **Requirement**: 30 consecutive days
- **Icon**: Lucide `CalendarCheck`

## Implementation Details

### Portal Time Tracking

Portal time is tracked automatically when users are logged in. The system:
1. Starts tracking when the Layout component mounts (user is authenticated)
2. Checks every minute for time spent
3. Awards points every 5 minutes of active usage
4. Updates total portal time in user stats
5. Stops tracking when user logs out or component unmounts

### Meeting Join Tracking

When a user clicks "Join Meeting":
1. The system retrieves the meeting data from Firestore
2. Calculates the time difference between current time and meeting time
3. Determines if the join is early, on-time, or late
4. Awards appropriate points based on timing
5. Updates meeting statistics

**Time Validation Rules:**
- **Early**: 15+ minutes before meeting start time
- **On-time**: Within 15 minutes before or after meeting start time
- **Late**: More than 15 minutes after meeting start time

### Database Write Tracking

Database writes are tracked automatically when:
- Projects are created or updated
- Evaluations are submitted
- Any other Firestore write operations occur

The system uses the `trackDatabaseWrite()` function which can be called after any write operation.

### Daily Login Tracking

Daily login is tracked automatically:
1. When user authenticates, the system checks if they've logged in today
2. If not logged in today, awards daily login points
3. Tracks consecutive login days
4. Awards consistency badges when milestones are reached

## Data Structure

### User Gamification Stats

Stored at: `users/{userId}/gamification/stats`

```javascript
{
    totalPoints: number,
    totalPortalTime: number,        // in minutes
    lastActiveTime: timestamp,
    lastLoginDate: string,          // ISO date string
    consecutiveDays: number,
    totalMeetings: number,
    onTimeMeetings: number,
    earlyMeetings: number,
    lateMeetings: number,
    projectsCreated: number,
    projectsUpdated: number,
    evaluationsSubmitted: number,
    papersRead: number,
    papersSubmitted: number,
    databaseWrites: number,
    badges: string[],               // Array of badge IDs
    createdAt: timestamp,
    updatedAt: timestamp
}
```

### Point Transactions

Stored at: `users/{userId}/gamification/transactions`

Each transaction record:
```javascript
{
    points: number,
    reason: string,
    metadata: object,
    createdAt: timestamp
}
```

### Badge Records

Stored at: `users/{userId}/gamification/badges`

Each badge record:
```javascript
{
    badgeId: string,
    badgeName: string,
    earnedAt: timestamp
}
```

## Usage Examples

### Awarding Points

```javascript
import { awardPoints } from '../utils/gamification';

// Award points for a custom action
await awardPoints(userId, 25, 'Completed custom task', {
    taskId: 'task123',
    category: 'custom'
});
```

### Tracking Project Creation

```javascript
import { trackProjectCreate } from '../utils/gamification';

const projectDoc = await addDoc(projectsRef, projectData);
await trackProjectCreate(projectDoc.id);
```

### Tracking Meeting Join

```javascript
import { trackMeetingJoin } from '../utils/gamification';

await trackMeetingJoin(meetingId, {
    date: '2025-01-15',
    time: '14:00',
    timezone: 'America/Chicago'
}, meetingLink);
```

### Getting User Stats

```javascript
import { getUserGamificationStats } from '../utils/gamification';

const stats = await getUserGamificationStats(userId);
console.log(`Total points: ${stats.totalPoints}`);
console.log(`Badges earned: ${stats.badges.length}`);
```

### Getting User Badges

```javascript
import { getUserBadges } from '../utils/gamification';

const badges = await getUserBadges(userId);
badges.forEach(badge => {
    console.log(`${badge.icon} ${badge.name}: ${badge.description}`);
});
```

## Activity Page

The Activity page displays:
- **Gamification Stats**: Total points, portal time, meetings joined, projects created
- **Badges Section**: All earned badges with icons and descriptions
- **Recent Points**: Last 10 point transactions with reasons
- **Activity History**: Complete activity feed from Firestore

## Future Enhancements

Potential additions to the gamification system:

1. **Leaderboards**: Compare points and badges with other users
2. **Challenges**: Time-limited challenges with special rewards
3. **Streaks**: Visual representation of consecutive activity
4. **Categories**: Separate point categories (engagement, research, collaboration)
5. **Rewards**: Unlockable features or privileges based on achievements
6. **Social Features**: Share achievements, congratulate others
7. **Analytics**: Detailed breakdown of point sources and trends
8. **Custom Badges**: Admin-created custom badges for special events

## Technical Notes

- All gamification functions are async and handle errors gracefully
- Points are awarded using Firestore `increment()` for atomic updates
- Badge checking happens automatically after point awards
- Portal time tracking uses intervals and cleans up on unmount
- Meeting time validation accounts for timezone differences
- Daily login tracking prevents duplicate awards for the same day

## Configuration

Point values and badge requirements can be modified in:
- `src/utils/gamification.js` - `POINT_VALUES` and `BADGES` constants

Badge conditions are defined as functions that check user stats, making it easy to add new badges or modify requirements.

