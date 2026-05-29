export type Role = "user" | "admin";
export type TransactionKind = "award" | "redeem" | "decay" | "streak";
export type TaskCategory = "romantic" | "fun" | "emotional" | "practical";
export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskStatus =
  | "pending"
  | "submitted"
  | "active"
  | "pendingApproval"
  | "approved"
  | "rejected"
  | "countered"
  | "completed"
  | "archived"
  | "expired";
export type FavorTier = "easy" | "medium" | "hard";
export type FavorRequestStatus =
  | "pending_review"
  | "negotiating"
  | "agreed"
  | "rejected"
  | "withdrawn"
  | "expired";
export type NegotiationAction = "tier" | "counter" | "agree" | "reject" | "withdraw";
export type MessageReaction = "❤️" | "😂" | "🔥" | "🥺" | "✨" | "👏";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  inviteCode: string;
  relationshipId: string | null;
  partnerId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface WalletDoc {
  ownerUid: string;
  relationshipId: string | null;
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
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface TransactionDoc {
  walletId: string;
  ownerUid: string;
  relationshipId: string | null;
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
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface AiTaskPoolDoc {
  category: TaskCategory;
  title: string;
  prompt: string;
  difficulty: TaskDifficulty;
  rewardValue: number;
  surpriseEligible: boolean;
  active: boolean;
  generatedBy: "seed" | "scheduled-ai";
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface TaskDoc {
  ownerUid: string;
  relationshipId: string | null;
  category: TaskCategory;
  title: string;
  prompt: string;
  difficulty: TaskDifficulty;
  rewardValue: number;
  status: TaskStatus;
  surprise: boolean;
  revealed: boolean;
  assignedForDay: string;
  sourcePoolId: string;
  expiresAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  completedBy: string | null;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  taskType?: "daily" | "longTerm" | "surprise";
  description?: string;
  points?: number;
  assignedTo?: string[];
  createdBy?: string;
  requiresApproval?: boolean;
  assignedPartner?: string | null;
  submissionLocked?: boolean;
  submissionNote?: string | null;
  rejectionNote?: string | null;
  counterNote?: string | null;
  counterPoints?: number | null;
  threadId?: string | null;
  archivedAt?: FirebaseFirestore.Timestamp | null;
  expiredAt?: FirebaseFirestore.Timestamp | null;
  resetDay?: string | null;
}

export interface FavorRequestDoc {
  relationshipId: string;
  requesterUid: string;
  reviewerUid: string;
  title: string;
  description: string;
  status: FavorRequestStatus;
  assignedTier: FavorTier | null;
  assignedPointCost: number | null;
  currentPointCost: number | null;
  lastProposalBy: string | null;
  threadId: string | null;
  agreementId: string | null;
  rejectionNote: string | null;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  reviewedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  currentRound?: number;
  maxRounds?: number;
  expiresAt?: number;
  lockedAt?: number | null;
  finalResolvedAt?: number | null;
}

export interface NegotiationDoc {
  favorRequestId: string;
  relationshipId: string;
  proposerUid: string;
  proposalType: "tier" | "counter" | "agree" | "reject";
  note: string;
  proposedPointCost: number | null;
  proposedTier: FavorTier | null;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  round?: number;
  actor?: string;
  action?: NegotiationAction;
  tier?: FavorTier | null;
  pointCost?: number | null;
}

export interface ThreadMessageDoc {
  favorRequestId: string | null;
  threadId: string;
  senderUid: string;
  text: string;
  reactions: Record<string, string[]>;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  replyToId?: string | null;
  submissionId?: string | null;
}

export interface AgreementDoc {
  favorRequestId: string;
  relationshipId: string;
  requesterUid: string;
  reviewerUid: string;
  finalPointCost: number;
  finalTier: FavorTier | null;
  acceptedProposalId: string | null;
  finalizedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface TaskSubmissionDoc {
  taskId: string;
  submittedBy: string;
  assignedPartner: string;
  relationshipId: string;
  threadId: string;
  status: "pending" | "approved" | "rejected" | "countered";
  submissionNote: string;
  rejectionNote: string | null;
  counterNote: string | null;
  counterPoints: number | null;
  points: number;
  approvedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  taskTitle?: string;
  taskCategory?: string;
  reviewerUid?: string;
  note?: string;
  rewardValue?: number;
  reviewedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  reviewedBy?: string | null;
  counterRewardValue?: number | null;
}

export interface AchievementDoc {
  title: string;
  description: string;
  icon: string;
  requirement: string;
  unlockedBy: string[];
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface NotificationDoc {
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export interface MonthlySnapshotDoc {
  walletId: string;
  ownerUid: string;
  relationshipId: string | null;
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
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}
