/**
 * Constants used across the application.
 * 
 * These are static values that don't require backend calls.
 */

export const DIFFICULTY_POINTS = {
  easy: 20,
  medium: 40,
  hard: 60,
} as const;

export const FAVOR_TIER_POINTS = {
  1: 10,
  2: 25,
  3: 50,
} as const;

export const CLOUD_FUNCTIONS_OVERVIEW = `
# Cloud Functions Architecture

This application uses Google Cloud Functions to implement all business logic.

## Function Categories

### User Management
- getMe: Fetch current user profile
- getUser: Fetch another user's public profile
- linkPartner: Link two users as partners
- unlinkPartner: Unlink partners
- regenerateInviteCode: Generate new partner invite code

### Wallet & Points
- getWallet: Fetch wallet state
- getTransactionsFor: Fetch transaction history
- getMonthlySnapshotsFor: Fetch monthly wallet snapshots
- getDecayHistoryFor: Fetch decay transaction history
- awardPoints: Award points to a user
- redeemPoints: Redeem points
- updateStreak: Update daily streak

### Tasks
- getTasksForUser: Fetch all tasks
- getActiveTasks: Fetch pending/active tasks
- completeTask: Mark task complete
- revealTask: Reveal surprise task
- submitTaskCompletion: Submit task for partner review
- approveTaskSubmission: Approve submitted task
- rejectTaskSubmission: Reject task submission
- getPendingApprovals: Get tasks pending partner approval
- getMyAchievements: Get achievements
- getSubmissionTask: Get task details for a submission

### Messaging & Threads
- getThreads: Get all threads for user
- getThreadMessages: Get messages in a thread
- sendThreadMessage: Send a message to thread
- toggleThreadReaction: Toggle emoji reaction on message

### Favors & Negotiation
- submitFavorRequest: Create a favor request
- getFavorRequests: Get user's favor requests
- getFavorRequestsToReview: Get favors to review
- getFavorRequest: Get specific favor details
- assignFavorTier: Assign tier to favor
- proposeFavorCounter: Counter-propose different terms
- acceptFavorAgreement: Accept favor agreement
- rejectFavorRequest: Reject favor
- sendFavorThreadMessage: Send message in favor negotiation
- toggleFavorThreadReaction: Toggle reaction in favor thread
- getNegotiationsFor: Get all negotiations for a favor

### Admin
- getAdminStats: Admin dashboard statistics
- getAuditLogs: Get audit log entries
- getAdminTasks: Get all tasks (admin view)
- getNormalUsers: Get non-admin users
- archiveTaskViaAdmin: Archive a task
- createTaskViaAdmin: Create a task manually
- getAdminAnalytics: Get analytics data
- getSystemHealth: Get system health metrics

### Scheduled Functions
- applyMonthlyDecay: Monthly wallet decay (1st of month)
- generateAiTaskPool: Generate AI task pools (2 AM UTC)
- assignDailyTasks: Assign daily tasks (5 AM UTC)
- expireDailyTasks: Expire overdue tasks (every 30 minutes)
`;

export const FIRESTORE_RULES = `
// Firestore security rules
// See firebase/firestore.rules for actual implementation

Key Rules:
- Users can only read/write their own document
- Wallets are private to owner
- Transactions are private to owner
- Tasks visible to owner only during active period
- Threads require participant membership
- Favor requests restricted to requester/reviewer
`;

export const FIRESTORE_SCHEMA = `
# Firestore Schema

## Collections

### users
- uid (string, PK)
- email
- displayName
- role ('user' | 'admin')
- partnerId (nullable)
- relationshipId (nullable)
- inviteCode
- createdAt

### wallets
- ownerUid (string, PK)
- balance
- lifetimeEarned
- lifetimeRedeemed
- lifetimeDecayed
- monthlyRedeemed
- monthlyCap (100)
- currentMonthKey
- currentStreak
- bestStreak
- lastStreakDate
- createdAt, updatedAt

### transactions
- id (string, doc ID)
- ownerUid
- walletId
- kind ('earning' | 'redemption' | 'decay')
- delta
- amount
- balanceAfter
- reason
- createdAt

### tasks
- id (string, doc ID)
- ownerUid
- category
- title
- prompt
- difficulty ('easy' | 'medium' | 'hard')
- rewardValue
- status ('pending' | 'active' | 'completed' | 'expired')
- surprise (boolean)
- revealed (boolean)
- assignedForDay
- expiresAt
- completedAt
- createdAt

### favorRequests
- id (string, doc ID)
- requesterUid
- reviewerUid
- title
- description
- status
- assignedTier
- currentPointCost
- threadId
- agreementId
- createdAt

### notifications
- id (string, doc ID)
- userId
- title
- body
- type
- read (boolean)
- createdAt

### threads (collection group)
- Subcollection: messages
  - id (string, doc ID)
  - senderUid
  - text
  - reactions (object)
  - createdAt
`;
