import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  getDocs,
  where, 
  orderBy, 
  runTransaction, 
  setDoc,
  increment, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  limit,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "./firebaseClient";
import type { WalletDoc, TaskDoc, ThreadDoc, MessageDoc, FavorDoc, TransactionDoc, StreakDoc } from "../pages/firebaseTypes";
import { UserDoc } from "../pages/firebaseTypes";

/**
 * REWRITE: Direct Firestore SDK logic (No Cloud Functions)
 * Adhering to the "1ne" Spec.
 */

async function logSystemEvent(description: string, actor: string) {
  await addDoc(collection(db, "auditLogs"), {
    description,
    actor,
    timestamp: serverTimestamp(),
  });
}

export async function getMe(): Promise<UserDoc | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserDoc;
}

// ============================================================================
// TASK ACTIONS
// ============================================================================

export async function adminCreateTask(data: Partial<TaskDoc>, adminName: string) {
  // If assigned to multiple/both, we create individual docs for independent progress
  const promises = data.assignedTo?.map(async (uid) => {
    let expiry = data.expiresAt;
    
    // Auto-calculate midnight for Daily tasks if not provided
    if (data.type === 'daily') {
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      expiry = Timestamp.fromDate(midnight);
    }

    const docRef = await addDoc(collection(db, "tasks"), {
      ...data,
      assignedTo: [uid], // Individual assignment
      expiresAt: expiry,
      status: "active",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  });

  const ids = await Promise.all(promises || []);
  await logSystemEvent(`Task "${data.title}" created for ${data.assignedTo?.length} members`, adminName);
  return ids;
}

async function logTransaction(uid: string, coupleId: string, type: "earned" | "spent" | "decayed", amount: number, reason: string) {
  await addDoc(collection(db, "transactions"), {
    uid,
    coupleId,
    type,
    amount,
    reason,
    timestamp: serverTimestamp(),
  });
}

export async function adminArchiveTask(taskId: string, adminName: string) {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { status: "archived" });
  await logSystemEvent(`Task archived by admin`, adminName);
}

export async function adminDeleteTask(taskId: string, adminName: string) {
  const taskRef = doc(db, "tasks", taskId);
  await deleteDoc(taskRef);
  await logSystemEvent(`Task deleted by admin`, adminName);
}

export async function adminGetMembers(): Promise<UserDoc[]> {
  const q = query(collection(db, "users"), where("role", "==", "member"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDoc));
}

export async function getWalletData(uid: string): Promise<WalletDoc> {
  const walletRef = doc(db, "wallets", uid);
  const snap = await getDoc(walletRef);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!snap.exists()) {
    const initial: WalletDoc = {
      uid,
      totalPoints: 0,
      monthlyRedeemed: 0,
      lastDecayMonth: currentMonth
    };
    await setDoc(walletRef, initial);
    return initial;
  }

  let data = snap.data() as WalletDoc;

  if (data.lastDecayMonth !== currentMonth) {
    const newBalance = Math.floor(data.totalPoints * 0.8);
    const update = {
      totalPoints: newBalance,
      monthlyRedeemed: 0,
      lastDecayMonth: currentMonth
    };
    const decayedAmount = data.totalPoints - newBalance;
    await updateDoc(walletRef, update);
    if (decayedAmount > 0) {
      await logTransaction(uid, data.coupleId || "", "decayed", decayedAmount, `Monthly 20% decay`);
    }
    await logSystemEvent(`Monthly decay applied to balance for ${uid}`, "System");
    return { ...data, ...update };
  }

  return data;
}

export async function revealTask(taskId: string) {
  await updateDoc(doc(db, "tasks", taskId), { revealed: true });
}

export async function submitTask(taskId: string, memberUid: string, memberName: string) {
  await runTransaction(db, async (t) => {
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await t.get(taskRef);
    const task = taskSnap.data() as TaskDoc;

    // Reuse or create thread
    let threadId = task.threadId;
    if (!threadId) {
      const threadRef = await addDoc(collection(db, "threads"), {
        type: "task",
        referenceId: taskId,
        coupleId: task.coupleId,
        title: `${task.title} (Pending)`,
        participants: task.assignedTo,
        createdAt: serverTimestamp(),
      });
      threadId = threadRef.id;
    } else {
      t.update(doc(db, "threads", threadId), { title: `${task.title} (Pending)` });
    }

    t.update(taskRef, { status: "pending", threadId });
    await logSystemEvent(`Task "${task.title}" submitted by ${memberName}`, memberName);
  });
}

export async function approveTask(taskId: string, approverName: string) {
  await runTransaction(db, async (t) => {
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await t.get(taskRef);
    const task = taskSnap.data() as TaskDoc;
    
    // Credit points to owner (simple assume 1 assign for now)
    const uid = task.assignedTo[0];
    const walletRef = doc(db, "wallets", uid);
    t.update(walletRef, { totalPoints: increment(task.pointReward) });
    t.update(taskRef, { status: "approved" });
    
    await logTransaction(uid, task.coupleId, "earned", task.pointReward, `Completed task: ${task.title}`);

    // Update Streak
    const streakRef = doc(db, "streaks", uid);
    const streakSnap = await t.get(streakRef);
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (!streakSnap.exists()) {
      t.set(streakRef, { uid, current: 1, longest: 1, lastCompletionDate: today });
    } else {
      const sData = streakSnap.data() as StreakDoc;
      if (sData.lastCompletionDate !== today) {
        const isContinuous = sData.lastCompletionDate === yesterdayStr;
        const nextCurrent = isContinuous ? sData.current + 1 : 1;
        t.update(streakRef, {
          current: nextCurrent,
          longest: Math.max(nextCurrent, sData.longest),
          lastCompletionDate: today
        });
      }
    }

    if (task.threadId) {
      t.update(doc(db, "threads", task.threadId), { title: `${task.title} (Approved)` });
    }
    await logSystemEvent(`Task "${task.title}" approved by ${approverName}`, approverName);
  });
}

export async function getStreakData(uid: string): Promise<StreakDoc | null> {
  const snap = await getDoc(doc(db, "streaks", uid));
  if (!snap.exists()) return null;
  return snap.data() as StreakDoc;
}

export async function linkPartner(uid: string, inviteCode: string): Promise<{ ok: boolean; relationshipId: string }> {
  const q = query(collection(db, "users"), where("inviteCode", "==", inviteCode), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid invite code");

  const partnerDoc = snap.docs[0];
  const partnerData = partnerDoc.data() as UserDoc;
  if (partnerData.coupleId) throw new Error("Partner already linked");

  const coupleId = `couple_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), { coupleId, partnerId: partnerDoc.id });
  batch.update(doc(db, "users", partnerDoc.id), { coupleId, partnerId: uid, inviteCode: null });
  await batch.commit();

  const me = await getMe();
  await logSystemEvent(`Member linked with partner`, me?.displayName || uid);
  return { ok: true, relationshipId: coupleId };
}

export async function rejectTask(taskId: string, rejectorName: string) {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  const task = taskSnap.data() as TaskDoc;

  await updateDoc(taskRef, { status: "active" });
  if (task.threadId) {
    await updateDoc(doc(db, "threads", task.threadId), { title: `${task.title} (Rejected)` });
  }
  await logSystemEvent(`Task "${task.title}" rejected by ${rejectorName}`, rejectorName);
}

// ============================================================================
// FAVOR NEGOTIATION (3-STRIKE RULE)
// ============================================================================

export async function startFavorRequest(data: Partial<FavorDoc>, requesterName: string) {
  const threadRef = await addDoc(collection(db, "threads"), {
    type: "favor",
    coupleId: data.coupleId,
    title: `Favor: ${data.title} (Round 1 of 3)`,
    participants: [data.fromUid, data.toUid],
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "favorRequests"), {
    ...data,
    status: "pending",
    currentRound: 1,
    threadId: threadRef.id,
    createdAt: serverTimestamp(),
  });

  await logSystemEvent(`Favor initiated by ${requesterName}`, requesterName);
}

export async function counterFavor(favorId: string, newCost: number, actorName: string) {
  await runTransaction(db, async (t) => {
    const favorRef = doc(db, "favorRequests", favorId);
    const favorSnap = await t.get(favorRef);
    const favor = favorSnap.data() as FavorDoc;

    if (favor.currentRound >= 3) throw new Error("Maximum negotiation rounds reached (3-strike rule)");

    const nextRound = favor.currentRound + 1;
    t.update(favorRef, { proposedCost: newCost, currentRound: nextRound, status: "negotiating" });
    t.update(doc(db, "threads", favor.threadId), { title: `Favor: ${favor.title} (Round ${nextRound} of 3)` });
  });
}

export async function approveFavor(favorId: string, approverName: string) {
  await runTransaction(db, async (t) => {
    const favorRef = doc(db, "favorRequests", favorId);
    const favorSnap = await t.get(favorRef);
    const favor = favorSnap.data() as FavorDoc;

    const walletRef = doc(db, "wallets", favor.fromUid);
    const walletSnap = await t.get(walletRef);
    const wallet = walletSnap.data() as WalletDoc;

    if (wallet.totalPoints < favor.proposedCost) throw new Error("Partner has insufficient points");
    if (wallet.monthlyRedeemed + favor.proposedCost > 100) throw new Error("Partner's monthly cap reached");

    t.update(walletRef, { 
      totalPoints: increment(-favor.proposedCost),
      monthlyRedeemed: increment(favor.proposedCost)
    });
    
    t.update(favorRef, { status: "agreed", resolvedAt: serverTimestamp() });
    t.update(doc(db, "threads", favor.threadId), { title: `Favor: ${favor.title} (Approved)` });
    
    await logTransaction(favor.fromUid, favor.coupleId, "spent", favor.proposedCost, `Favor granted: ${favor.title}`);

    await logSystemEvent(`Favor "${favor.title}" approved by ${approverName}`, approverName);
  });
}

export async function rejectFavor(favorId: string, rejectorName: string) {
  const favorRef = doc(db, "favorRequests", favorId);
  const favorSnap = await getDoc(favorRef);
  const favor = favorSnap.data() as FavorDoc;

  await updateDoc(favorRef, { status: "rejected", resolvedAt: serverTimestamp() });
  await updateDoc(doc(db, "threads", favor.threadId), { title: `Favor: ${favor.title} (Rejected)` });
  await logSystemEvent(`Favor "${favor.title}" rejected by ${rejectorName}`, rejectorName);
}

export async function getTransactions(uid: string): Promise<TransactionDoc[]> {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionDoc));
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

export async function updateNickname(uid: string, nickname: string, actorName: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { nickname });
  await logSystemEvent(`${actorName} updated their nickname to "${nickname}"`, actorName);
}

export async function getPartnerData(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserDoc) : null;
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
  try {
    const q = query(collection(db, "favorRequests"), where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FavorRequestDoc));
  } catch {
    return [];
  }
}

export async function getFavorRequestsToReview(uid: string): Promise<FavorRequestDoc[]> {
  try {
    const user = await getMe();
    if (!user || !user.coupleId) return [];
    const q = query(collection(db, "favorRequests"), where("coupleId", "==", user.coupleId));
    const snap = await getDocs(q);
    return snap.docs
      .filter(d => d.data().uid !== uid)
      .map(d => ({ id: d.id, ...d.data() } as FavorRequestDoc));
  } catch {
    return [];
  }
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
  pointCost: number,
): Promise<{ ok: boolean }> {
  const user = await getMe();
  await addDoc(collection(db, "favorRequests"), {
    uid,
    coupleId: user.coupleId,
    title,
    description,
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
