/**
 * Frontend logic layer using direct Firestore SDK calls.
 * Replaces Cloud Functions to maintain Spark (free) plan compatibility.
 */

import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  runTransaction, 
  writeBatch, 
  increment, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db, auth } from "./firebaseClient";
import type {
  UserDoc,
  WalletDoc,
  TransactionDoc,
  MonthlySnapshotDoc,
  TaskDoc,
  AchievementDoc,
  StreakDoc,
  TaskSubmissionDoc,
  ThreadDoc,
  MessageDoc,
  FavorRequestDoc,
  NotificationDoc,
  NegotiationDoc,
  AuditLogDoc,
} from "./firebaseTypes";

// ============================================================================
// USER CALLABLES
// ============================================================================

export async function getMe(): Promise<UserDoc | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserDoc;
}

export async function getUser(uid: string): Promise<UserDoc> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("User not found");
  return { uid: snap.id, ...snap.data() } as UserDoc;
}

export async function getPartner(uid: string): Promise<UserDoc | null> {
  const userSnap = await getDoc(doc(db, "users", uid));
  const userData = userSnap.data() as UserDoc;
  if (!userData?.coupleId) return null;

  const q = query(
    collection(db, "users"),
    where("coupleId", "==", userData.coupleId)
  );
  const querySnap = await getDocs(q);
  const partnerDoc = querySnap.docs.find(d => d.id !== uid);
  return partnerDoc ? ({ uid: partnerDoc.id, ...partnerDoc.data() } as UserDoc) : null;
}

// ============================================================================
// WALLET CALLABLES
// ============================================================================

export async function getWallet(uid: string): Promise<WalletDoc> {
  const snap = await getDoc(doc(db, "wallets", uid));
  if (!snap.exists()) throw new Error("Wallet not found");
  return snap.data() as WalletDoc;
}

export async function getTransactionsFor(uid: string, limit = 50): Promise<TransactionDoc[]> {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("timestamp", "desc"),
    firestoreLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as TransactionDoc[];
}

export async function getMonthlySnapshotsFor(_uid: string, _limit = 12): Promise<MonthlySnapshotDoc[]> {
  return [];
}

export async function getDecayHistoryFor(uid: string, limit = 24): Promise<TransactionDoc[]> {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    where("type", "==", "decayed"),
    orderBy("timestamp", "desc"),
    firestoreLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as TransactionDoc[];
}

// ============================================================================
// TASK CALLABLES
// ============================================================================

export async function getTasksForUser(uid: string): Promise<TaskDoc[]> {
  const q = query(collection(db, "tasks"), where("assignedTo", "==", uid));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as TaskDoc))
    .filter(t => t.status !== "archived");
}

export async function getActiveTasks(uid: string): Promise<TaskDoc[]> {
  const q = query(
    collection(db, "tasks"),
    where("assignedTo", "==", uid),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDoc));
}

export async function getPendingApprovals(uid: string): Promise<TaskSubmissionDoc[]> {
  const user = await getMe();
  if (!user.coupleId) return [];
  const q = query(
    collection(db, "taskSubmissions"),
    where("coupleId", "==", user.coupleId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskSubmissionDoc));
}

export async function getMyAchievements(_uid: string): Promise<AchievementDoc[]> {
  return [];
}

export async function completeTask(_uid: string, taskId: string): Promise<{ ok: boolean }> {
  await updateDoc(doc(db, "tasks", taskId), { status: "pending" });
  return { ok: true };
}

export async function revealTask(uid: string, taskId: string): Promise<{ ok: boolean }> {
  return { ok: true };
}

// Alias for backward compatibility
export const revealSurpriseTask = revealTask;

export async function submitTaskCompletion(
  uid: string,
  taskId: string,
  submissionNote?: string,
): Promise<{ ok: boolean }> {
  const user = await getMe();
  await addDoc(collection(db, "taskSubmissions"), {
    taskId,
    uid,
    coupleId: user.coupleId,
    submissionNote: submissionNote || "",
    status: "pending",
    submittedAt: serverTimestamp()
  });
  return { ok: true };
}

export async function approveTaskSubmission(
  _uid: string,
  submissionId: string,
): Promise<{ ok: boolean }> {
  await runTransaction(db, async (transaction) => {
    const subRef = doc(db, "taskSubmissions", submissionId);
    const subSnap = await transaction.get(subRef);
    if (!subSnap.exists()) throw new Error("Submission not found");
    const subData = subSnap.data() as TaskSubmissionDoc;

    const taskRef = doc(db, "tasks", subData.taskId);
    const taskSnap = await transaction.get(taskRef);
    if (!taskSnap.exists()) throw new Error("Task not found");
    const taskData = taskSnap.data() as TaskDoc;
    const points = taskData.rewardValue || 0;

    transaction.update(subRef, { status: "approved" });
    transaction.update(taskRef, { status: "approved" });
    
    const walletRef = doc(db, "wallets", subData.uid);
    transaction.set(walletRef, { totalPoints: increment(points) }, { merge: true });

    const txRef = doc(collection(db, "transactions"));
    transaction.set(txRef, {
      uid: subData.uid,
      coupleId: subData.coupleId,
      type: "earned",
      delta: points,
      reason: "Task approved",
      timestamp: serverTimestamp()
    });
  });
  return { ok: true };
}

export async function rejectTaskSubmission(
  _uid: string,
  submissionId: string,
  _note?: string,
): Promise<{ ok: boolean }> {
  const subRef = doc(db, "taskSubmissions", submissionId);
  const subSnap = await getDoc(subRef);
  const taskId = subSnap.data()?.taskId;

  const batch = writeBatch(db);
  batch.update(subRef, { status: "rejected" });
  if (taskId) {
    batch.update(doc(db, "tasks", taskId), { status: "rejected" });
  }
  await batch.commit();
  return { ok: true };
}

export async function getSubmissionTask(submissionId: string): Promise<TaskSubmissionDoc> {
  const snap = await getDoc(doc(db, "taskSubmissions", submissionId));
  if (!snap.exists()) throw new Error("Submission not found");
  return { id: snap.id, ...snap.data() } as TaskSubmissionDoc;
}

export async function getAdminTasks(_uid: string): Promise<TaskDoc[]> {
  const user = await getMe();
  const q = query(collection(db, "tasks"), where("coupleId", "==", user.coupleId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDoc));
}

export async function archiveTaskViaAdmin(taskId: string): Promise<{ ok: boolean }> {
  await updateDoc(doc(db, "tasks", taskId), { status: "archived" });
  return { ok: true };
}

export async function createTaskViaAdmin(
  title: string,
  prompt: string,
  category: string,
  difficulty: string,
  rewardValue: number,
): Promise<{ ok: boolean }> {
  const user = await getMe();
  await addDoc(collection(db, "tasks"), {
    coupleId: user.coupleId,
    assignedTo: user.partnerId,
    title,
    prompt,
    category,
    difficulty,
    rewardValue,
    status: "active",
    createdAt: serverTimestamp()
  });
  return { ok: true };
}

// ============================================================================
// THREAD/MESSAGING CALLABLES
// ============================================================================

export async function getThreads(uid: string): Promise<ThreadDoc[]> {
  const user = await getMe();
  const q = query(collection(db, "threads"), where("coupleId", "==", user.coupleId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ThreadDoc));
}

export async function getThreadMessages(threadId: string): Promise<MessageDoc[]> {
  const q = query(
    collection(db, "threads", threadId, "messages"),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageDoc));
}

export async function sendThreadMessage(
  uid: string,
  threadId: string,
  text: string,
): Promise<{ id: string; ok: boolean }> {
  const ref = await addDoc(collection(db, "threads", threadId, "messages"), {
    senderUid: uid,
    text,
    timestamp: serverTimestamp()
  });
  return { id: ref.id, ok: true };
}

export async function toggleThreadReaction(
  uid: string,
  threadId: string, // Adjusted to include threadId context needed for direct SDK
  messageId: string,
  reaction: string,
): Promise<{ ok: boolean }> {
  const msgRef = doc(db, "threads", threadId, "messages", messageId);
  await runTransaction(db, async (t) => {
    const snap = await t.get(msgRef);
    const reactions = snap.data()?.reactions || {};
    const users: string[] = reactions[reaction] || [];
    
    if (users.includes(uid)) {
      t.update(msgRef, { [`reactions.${reaction}`]: arrayRemove(uid) });
    } else {
      t.update(msgRef, { [`reactions.${reaction}`]: arrayUnion(uid) });
    }
  });
  return { ok: true };
}

// Alias for backward compatibility (used in pages)
export const toggleReaction = toggleThreadReaction;

// ============================================================================
// FAVOR/NEGOTIATION CALLABLES
// ============================================================================

export async function getFavorRequests(uid: string): Promise<FavorRequestDoc[]> {
  const q = query(collection(db, "favorRequests"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FavorRequestDoc));
}

export async function getFavorRequestsToReview(uid: string): Promise<FavorRequestDoc[]> {
  const user = await getMe();
  const q = query(collection(db, "favorRequests"), where("coupleId", "==", user.coupleId));
  const snap = await getDocs(q);
  return snap.docs
    .filter(d => d.data().uid !== uid)
    .map(d => ({ id: d.id, ...d.data() } as FavorRequestDoc));
}

export async function getFavorRequest(favorRequestId: string): Promise<FavorRequestDoc> {
  const snap = await getDoc(doc(db, "favorRequests", favorRequestId));
  if (!snap.exists()) throw new Error("Favor not found");
  return { id: snap.id, ...snap.data() } as FavorRequestDoc;
}

export async function getNegotiationsFor(favorRequestId: string): Promise<NegotiationDoc[]> {
  const q = query(
    collection(db, "favorRequests", favorRequestId, "negotiations"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NegotiationDoc));
}

export async function submitFavorRequest(
  uid: string,
  title: string,
  description: string,
  tier: string,
  pointCost: number,
): Promise<{ ok: boolean }> {
  const user = await getMe();
  await addDoc(collection(db, "favorRequests"), {
    uid,
    coupleId: user.coupleId,
    title,
    description,
    tier: tier || "pending",
    pointCost: pointCost || 0,
    status: "pending",
    createdAt: serverTimestamp()
  });
  return { ok: true };
}

export async function assignFavorTier(
  uid: string,
  favorRequestId: string,
  tier: string,
  note?: string,
): Promise<{ ok: boolean }> {
  await updateDoc(doc(db, "favorRequests", favorRequestId), { tier });
  return { ok: true };
}

export async function proposeFavorCounter(
  uid: string,
  favorRequestId: string,
  pointCost: number,
  note?: string,
): Promise<{ ok: boolean }> {
  const favorRef = doc(db, "favorRequests", favorRequestId);
  await addDoc(collection(favorRef, "negotiations"), {
    uid,
    pointCost,
    note: note || "",
    createdAt: serverTimestamp()
  });
  await updateDoc(favorRef, { status: "countered" });
  return { ok: true };
}

export async function acceptFavorAgreement(
  _uid: string,
  favorRequestId: string,
): Promise<{ ok: boolean }> {
  await runTransaction(db, async (t) => {
    const favorRef = doc(db, "favorRequests", favorRequestId);
    const favorSnap = await t.get(favorRef);
    const favorData = favorSnap.data() as FavorRequestDoc;
    if (!favorData) throw new Error("Favor missing");

    const cost = favorData.pointCost || 0;
    const walletRef = doc(db, "wallets", favorData.uid);
    
    t.update(walletRef, { totalPoints: increment(-cost) });
    t.update(favorRef, { status: "agreed" });
    
    const txRef = doc(collection(db, "transactions"));
    t.set(txRef, {
      uid: favorData.uid,
      coupleId: favorData.coupleId,
      type: "spent",
      delta: -cost,
      reason: `Favor agreed: ${favorData.title}`,
      timestamp: serverTimestamp()
    });
  });
  return { ok: true };
}

export async function rejectFavorRequest(
  _uid: string,
  favorRequestId: string,
  _note?: string,
): Promise<{ ok: boolean }> {
  await updateDoc(doc(db, "favorRequests", favorRequestId), { status: "rejected" });
  return { ok: true };
}

export async function sendFavorThreadMessage(
  uid: string,
  favorRequestId: string,
  text: string,
): Promise<{ ok: boolean }> {
  await addDoc(collection(db, "favorRequests", favorRequestId, "thread"), {
    senderUid: uid,
    text,
    timestamp: serverTimestamp()
  });
  return { ok: true };
}

export async function toggleFavorThreadReaction(
  uid: string,
  favorId: string,
  messageId: string,
  emoji: string,
): Promise<{ ok: boolean }> {
  const msgRef = doc(db, "favorRequests", favorId, "thread", messageId);
  await runTransaction(db, async (t) => {
    const doc = await t.get(msgRef);
    const reactions = doc.data()?.reactions || {};
    const users: string[] = reactions[emoji] || [];
    if (users.includes(uid)) t.update(msgRef, { [`reactions.${emoji}`]: arrayRemove(uid) });
    else t.update(msgRef, { [`reactions.${emoji}`]: arrayUnion(uid) });
  });
  return { ok: true };
}

// ============================================================================
// STREAK CALLABLES
// ============================================================================

export async function getStreak(uid: string): Promise<StreakDoc> {
  const snap = await getDoc(doc(db, "streaks", uid));
  if (!snap.exists()) throw new Error("Streak not found");
  return snap.data() as StreakDoc;
}

export async function awardPoints(
  uid: string,
  amount: number,
  reason?: string,
): Promise<{ ok: boolean }> {
  const user = await getUser(uid);
  await updateDoc(doc(db, "wallets", uid), { totalPoints: increment(amount) });
  await addDoc(collection(db, "transactions"), {
    uid,
    coupleId: user.coupleId,
    type: "earned",
    delta: amount,
    reason: reason || "Awarded points",
    timestamp: serverTimestamp()
  });
  return { ok: true };
}

export async function redeemPoints(
  uid: string,
  amount: number,
  reason?: string,
): Promise<{ ok: boolean }> {
  const user = await getUser(uid);
  await updateDoc(doc(db, "wallets", uid), {
    totalPoints: increment(-amount),
    monthlyRedeemed: increment(amount)
  });
  await addDoc(collection(db, "transactions"), {
    uid,
    coupleId: user.coupleId,
    type: "spent",
    delta: -amount,
    reason: reason || "Points redeemed",
    timestamp: serverTimestamp()
  });
  return { ok: true };
}

export async function updateStreak(uid: string, _performedAt?: number): Promise<{ ok: boolean }> {
  const streakRef = doc(db, "streaks", uid);
  const userRef = doc(db, "users", uid);
  const todayStr = new Date().toISOString().split("T")[0];
  
  await runTransaction(db, async (t) => {
    const snap = await t.get(streakRef);
    const streak = snap.data() || { currentStreak: 0, longestStreak: 0, lastStreakDate: "" };
    if (streak.lastStreakDate === todayStr) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    const newStreak = streak.lastStreakDate === yesterdayStr ? streak.currentStreak + 1 : 1;
    const longest = Math.max(newStreak, streak.longestStreak || 0);
    const updateData = { currentStreak: newStreak, longestStreak: longest, lastStreakDate: todayStr };
    
    t.set(streakRef, updateData, { merge: true });
    t.update(userRef, updateData);
  });
  return { ok: true };
}

// ============================================================================
// NOTIFICATION CALLABLES
// ============================================================================

export async function getNotificationsFor(uid: string): Promise<NotificationDoc[]> {
  const q = query(
    collection(db, "notifications"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as NotificationDoc[];
}

export async function markNotificationRead(_uid: string, notificationId: string): Promise<{ ok: boolean }> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
  return { ok: true };
}

// ============================================================================
// PARTNER MANAGEMENT CALLABLES
// ============================================================================

export async function linkPartner(
  uid: string,
  inviteCode: string,
): Promise<{ ok: boolean; relationshipId: string }> {
  const q = query(collection(db, "users"), where("inviteCode", "==", inviteCode), firestoreLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid invite code");
  
  const partnerDoc = snap.docs[0];
  if (partnerDoc.data().coupleId) throw new Error("Already linked");
  
  const coupleId = "couple_" + Date.now();
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), { coupleId, partnerId: partnerDoc.id });
  batch.update(partnerDoc.ref, { coupleId, partnerId: uid, inviteCode: null });
  await batch.commit();
  return { ok: true, relationshipId: coupleId };
}

export async function unlinkPartner(uid: string): Promise<{ ok: boolean }> {
  const user = await getMe();
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), { coupleId: null, partnerId: null });
  if (user.partnerId) {
    batch.update(doc(db, "users", user.partnerId), { coupleId: null, partnerId: null });
  }
  await batch.commit();
  return { ok: true };
}

export async function regenerateInviteCode(uid: string): Promise<{ ok: boolean; inviteCode: string }> {
  const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  await updateDoc(doc(db, "users", uid), { inviteCode: newCode });
  return { ok: true, inviteCode: newCode };
}

// ============================================================================
// WRAPPER HELPERS FOR FAVOR NEGOTIATION
// ============================================================================

/**
 * Respond to a favor request with different actions.
 * This wraps multiple callables into one convenient function.
 */
export async function respondToFavorRequest(
  uid: string,
  favorRequestId: string,
  action: "counter" | "accept" | "reject",
  tier?: string,
  pointCost?: number,
  note?: string,
): Promise<{ ok: boolean }> {
  if (action === "counter" && tier && pointCost) {
    await assignFavorTier(uid, favorRequestId, tier, note);
    return proposeFavorCounter(uid, favorRequestId, pointCost, note);
  } else if (action === "accept") {
    return acceptFavorAgreement(uid, favorRequestId);
  } else if (action === "reject") {
    return rejectFavorRequest(uid, favorRequestId, note);
  }
  throw new Error(`Unknown action: ${action}`);
}

/**
 * Respond to a counter-proposal.
 * (simplified wrapper for counter negotiation actions)
 */
export async function respondToCounter(
  uid: string,
  favorRequestId: string,
  action: "accept" | "withdraw",
): Promise<{ ok: boolean }> {
  if (action === "accept") {
    return acceptFavorAgreement(uid, favorRequestId);
  } else if (action === "withdraw") {
    return rejectFavorRequest(uid, favorRequestId);
  }
  throw new Error(`Unknown counter action: ${action}`);
}

export async function getAdminStats(): Promise<any> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  const userDoc = await getDoc(doc(db, "users", uid));
  const coupleId = userDoc.data()?.coupleId;
  
  const [usersSnap, tasksSnap, favorsSnap] = await Promise.all([
    coupleId 
      ? getDocs(query(collection(db, "users"), 
          where("coupleId", "==", coupleId)))
      : getDocs(query(collection(db, "users"), 
          where("uid", "==", uid))),
    coupleId
      ? getDocs(query(collection(db, "tasks"), 
          where("coupleId", "==", coupleId)))
      : Promise.resolve({ size: 0 } as any),
    coupleId  
      ? getDocs(query(collection(db, "favorRequests"), 
          where("coupleId", "==", coupleId)))
      : Promise.resolve({ size: 0 } as any),
  ]);
  
  return { 
    totalUsers: usersSnap.size, 
    totalTasks: tasksSnap.size, 
    totalFavorRequests: favorsSnap.size 
  };
}

export async function getAuditLogs(limit?: number): Promise<AuditLogDoc[]> {
  const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), firestoreLimit(limit || 50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogDoc));
}

export async function getNormalUsers(): Promise<UserDoc[]> {
  const q = query(collection(db, "users"), where("role", "!=", "admin"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDoc));
}

export async function getAdminAnalytics(): Promise<any> {
  return {};
}

export async function getSystemHealth(): Promise<any> {
  return { status: "ok" };
}
