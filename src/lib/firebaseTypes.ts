export type Role = "user" | "admin";
export type TransactionKind = "award" | "redeem" | "decay" | "streak";
export type TaskType = "daily" | "longTerm" | "surprise";
export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskStatus =
  | "active"
  | "submitted"
  | "pendingApproval"
  | "approved"
  | "rejected"
  | "countered"
  | "completed"
  | "archived"
  | "expired";

export type FavorTier = 1 | 2 | 3;
export type FavorStatus = "pending_review" | "countered" | "accepted" | "rejected" | "withdrawn" | "expired";
export type NegotiationAction = "submit" | "accept" | "counter" | "reject" | "withdraw";
export type MessageReaction = "❤️" | "😂" | "🔥" | "🥺" | "✨" | "👏";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  inviteCode: string | null;
  coupleId: string | null;
  partnerId: string | null;
  createdAt: number;
}

export interface RelationshipDoc {
  id: string;
  userA: string;
  userB: string;
  createdAt: number;
}

export interface AuditLogDoc {
  id: string;
  actor: string;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}

export interface NotificationDoc {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: number;
}

export interface WalletDoc {
  id: string;
  ownerUid: string;
  coupleId: string | null;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lifetimeDecayed: number;
  monthlyRedeemed: number;
  monthlyCap: number;
  currentMonthKey: string;
  currentMonthStartedBalance: number;
  monthlyEarned: number;
  currentStreak: number;
  bestStreak: number;
  lastStreakDate: string | null;
  updatedAt: number;
  createdAt: number;
}

export interface TransactionDoc {
  id: string;
  walletId: string;
  ownerUid: string;
  coupleId: string | null;
  kind: TransactionKind;
  delta: number;
  amount: number;
  balanceAfter: number;
  reason: string;
  source: "cloud-function";
  immutable: true;
  createdBy: string | null;
  monthKey: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface MonthlySnapshotDoc {
  id: string;
  walletId: string;
  ownerUid: string;
  coupleId: string | null;
  monthKey: string;
  openingBalance: number;
  earned: number;
  redeemed: number;
  decayed: number;
  preDecayClosingBalance: number;
  closingBalance: number;
  redemptionCap: number;
  redemptionUsed: number;
  redemptionRemaining: number;
  currentStreak: number;
  lifetimeEarnedAtClose: number;
  createdAt: number;
}

export interface TaskDoc {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  difficulty: TaskDifficulty;
  points: number;
  assignedTo: string[];
  createdBy: string;
  status: TaskStatus;
  revealed: boolean;
  requiresApproval: boolean;
  coupleId: string | null;
  assignedPartner: string | null;
  submissionLocked: boolean;
  expiresAt: number | null;
  completedAt: number | null;
  completedBy: string | null;
  submissionNote: string | null;
  rejectionNote: string | null;
  counterNote: string | null;
  counterPoints: number | null;
  threadId: string | null;
  archivedAt: number | null;
  expiredAt: number | null;
  resetDay: string | null;
  createdAt: number;
}

export interface ThreadDoc {
  id: string;
  type: "taskThread" | "favorNegotiation";
  participants: string[];
  linkedTaskId: string | null;
  linkedRequestId: string | null;
  status: "open" | "closed";
  createdAt: number;
}

export interface MessageDoc {
  id: string;
  threadId: string;
  senderUid: string;
  text: string;
  reactions: Record<string, MessageReaction[]>;
  createdAt: number;
}

export interface AchievementDoc {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: string;
  unlockedBy: string[];
  createdAt: number;
}

export interface StreakDoc {
  id: string;
  ownerUid: string;
  coupleId: string | null;
  current: number;
  best: number;
  lastCompletionDay: string | null;
  totalCompletions: number;
  updatedAt: number;
  createdAt: number;
}

export interface FavorRequestDoc {
  id: string;
  coupleId: string;
  requesterUid: string;
  reviewerUid: string;
  title: string;
  description: string;
  status: FavorStatus;
  currentRound: number;
  maxRounds: number;
  rejectionNote: string | null;
  threadId: string | null;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  lockedAt: number | null;
  finalResolvedAt: number | null;
}

export interface NegotiationDoc {
  id: string;
  requestId: string;
  coupleId: string;
  round: number;
  actor: string;
  action: NegotiationAction;
  tier: FavorTier | null;
  pointCost: number | null;
  note: string | null;
  createdAt: number;
}

export interface TaskSubmissionDoc {
  id: string;
  taskId: string;
  submittedBy: string;
  assignedPartner: string;
  coupleId: string;
  threadId: string;
  status: "pending" | "approved" | "rejected" | "countered";
  submissionNote: string;
  rejectionNote: string | null;
  counterNote: string | null;
  counterPoints: number | null;
  points: number;
  approvedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuthUser {
  uid: string;
  email: string;
}

