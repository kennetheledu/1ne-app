import { Timestamp } from "firebase/firestore";

export type Role = "admin" | "member";
export type TaskType = "daily" | "long-term" | "surprise";
export type TaskStatus = "active" | "pending" | "approved" | "rejected" | "archived";
export type FavorStatus = "pending" | "negotiating" | "agreed" | "rejected";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  nickname: string;
  coupleId: string;
  partnerId?: string;
  createdAt: Timestamp;
}

export interface WalletDoc {
  uid: string;
  totalPoints: number;
  monthlyRedeemed: number;
  lastDecayMonth: string; // YYYY-MM
}

export interface TaskDoc {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  assignedTo: string[]; // [uid]
  coupleId: string;
  pointReward: number;
  status: TaskStatus;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  createdBy: string; // admin uid
  threadId?: string;
  revealed?: boolean; // For surprise tasks
}

export interface FavorDoc {
  id: string;
  fromUid: string;
  toUid: string;
  coupleId: string;
  title: string;
  description: string;
  proposedCost: number;
  status: FavorStatus;
  currentRound: number; // 1-3
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  threadId: string;
}

export interface ThreadDoc {
  id: string;
  type: "task" | "favor";
  referenceId: string; // taskId or favorId
  coupleId: string;
  title: string;
  participants: string[];
  createdAt: Timestamp;
}

export interface MessageDoc {
  id: string;
  senderUid: string;
  text: string;
  timestamp: Timestamp;
  reactions: Record<string, string[]>;
}

export interface AuditLogDoc {
  id: string;
  timestamp: Timestamp;
  description: string;
  actor: string; // displayName or "System"
}

export interface StreakDoc {
  uid: string;
  current: number;
  longest: number;
  lastCompletionDate: string;
}

export interface TransactionDoc {
  id: string;
  uid: string;
  coupleId: string;
  type: "earned" | "spent" | "decayed";
  amount: number;
  reason: string;
  timestamp: Timestamp;
}