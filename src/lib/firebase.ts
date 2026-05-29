/**
 * Deprecated legacy entrypoint - use specific modules instead.
 *
 * This file re-exports symbols from the new architecture for backward compatibility.
 * It is being phased out in favor of:
 *   - src/lib/firebaseClient.ts (Firebase SDK init only)
 *   - src/lib/firebaseCallables.ts (Cloud Functions wrappers)
 *   - src/lib/firebaseAuth.ts (Auth SDK functions)
 *   - src/lib/firebaseHelpers.ts (Local helper functions)
 *   - src/lib/firebaseConstants.ts (Constants)
 *   - src/lib/firebaseTypes.ts (Type definitions)
 *
 * New code should import from the specific modules above.
 * This shim will be removed once all imports are migrated.
 */

// ============================================================================
// TYPE EXPORTS (from firebaseTypes)
// ============================================================================

export type {
  AuthUser,
  Role,
  TransactionKind,
  TaskType,
  TaskDifficulty,
  TaskStatus,
  FavorTier,
  FavorStatus,
  NegotiationAction,
  MessageReaction,
  UserDoc,
  RelationshipDoc,
  AuditLogDoc,
  NotificationDoc,
  WalletDoc,
  TransactionDoc,
  MonthlySnapshotDoc,
  TaskDoc,
  ThreadDoc,
  MessageDoc,
  AchievementDoc,
  StreakDoc,
  FavorRequestDoc,
  NegotiationDoc,
  TaskSubmissionDoc,
} from "./firebaseTypes";

// ============================================================================
// SDK EXPORTS (from firebaseClient)
// ============================================================================

export { app, auth, db, messaging } from "./firebaseClient";

// ============================================================================
// AUTH FUNCTIONS (from firebaseAuth)
// ============================================================================

export {
  getAuthUser,
  onAuthStateChanged,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
} from "./firebaseAuth";

// ============================================================================
// CALLABLE FUNCTIONS (from firebaseCallables)
// ============================================================================

export {
  // User
  getMe,
  getUser,
  // Wallet
  getWallet,
  getTransactionsFor,
  getMonthlySnapshotsFor,
  getDecayHistoryFor,
  // Tasks
  getTasksForUser,
  getActiveTasks,
  getPendingApprovals,
  getMyAchievements,
  completeTask,
  revealTask,
  revealSurpriseTask,
  submitTaskCompletion,
  approveTaskSubmission,
  rejectTaskSubmission,
  getSubmissionTask,
  // Threads
  getThreads,
  getThreadMessages,
  sendThreadMessage,
  toggleThreadReaction,
  toggleReaction,
  // Favors
  getFavorRequests,
  getFavorRequestsToReview,
  getFavorRequest,
  getNegotiationsFor,
  submitFavorRequest,
  assignFavorTier,
  proposeFavorCounter,
  acceptFavorAgreement,
  rejectFavorRequest,
  sendFavorThreadMessage,
  toggleFavorThreadReaction,
  // Favor wrappers
  respondToFavorRequest,
  respondToCounter,
  // Streak
  getStreak,
  awardPoints,
  redeemPoints,
  updateStreak,
  // Notifications
  getNotificationsFor,
  markNotificationRead,
  // Partner
  linkPartner,
  getPartner as getPartnerDoc,
  unlinkPartner,
  regenerateInviteCode,
  // Admin
  getAdminStats,
  getAuditLogs,
  getAdminTasks,
  getNormalUsers,
  archiveTaskViaAdmin,
  createTaskViaAdmin,
  getAdminAnalytics,
  getSystemHealth,
} from "./firebaseCallables";

// ============================================================================
// HELPER FUNCTIONS (from firebaseHelpers)
// ============================================================================

export {
  getMonthlyCapProgress,
  getPartner,
  simulateMonthlyDecay,
  type CapProgress,
} from "./firebaseHelpers";

// ============================================================================
// CONSTANTS (from firebaseConstants)
// ============================================================================

export {
  DIFFICULTY_POINTS,
  FAVOR_TIER_POINTS,
  CLOUD_FUNCTIONS_OVERVIEW,
  FIRESTORE_RULES,
  FIRESTORE_SCHEMA,
} from "./firebaseConstants";
