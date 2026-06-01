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
  limit as firestoreLimit,
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
  if (!data || !data.title) throw new Error("Missing task data or title");
  if (!data.assignedTo || !Array.isArray(data.assignedTo) || data.assignedTo.length === 0) {
    throw new Error("adminCreateTask requires a non-empty assignedTo array");
  }

  // If assigned to multiple/both, we create individual docs for independent progress
  const promises = data.assignedTo.map(async (uid) => {
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
  if (!taskId) throw new Error("adminArchiveTask requires taskId");
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { status: "archived" });
  await logSystemEvent(`Task archived by admin`, adminName);
}

export async function adminDeleteTask(taskId: string, adminName: string) {
  if (!taskId) throw new Error("adminDeleteTask requires taskId");
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
  if (!uid) throw new Error("getWalletData requires uid");
  const snapUser = await getDoc(doc(db, "users", uid));
  if (!snapUser.exists()) throw new Error("User not found");
  const userData = snapUser.data() as UserDoc;

  if (userData?.role === 'admin') {
    return { uid, totalPoints: 0, monthlyRedeemed: 0, lastDecayMonth: '' };
  }

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
      await logTransaction(uid, userData.coupleId || "", "decayed", decayedAmount, `Monthly 20% decay`);
    }
    await logSystemEvent(`Monthly decay applied to balance for ${uid}`, "System");
    return { ...data, ...update };
  }

  return data;
}

export async function revealTask(taskId: string) {
  if (!taskId) throw new Error("revealTask requires taskId");
  await updateDoc(doc(db, "tasks", taskId), { revealed: true });
}

export async function submitTask(taskId: string, memberUid: string, memberName: string) {
  if (!taskId) throw new Error("submitTask requires taskId");
  // Use a transaction-safe pattern: create any new docs via a deterministic ref
  const result = await runTransaction(db, async (t) => {
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await t.get(taskRef);
    if (!taskSnap.exists()) throw new Error("Task not found");
    const task = taskSnap.data() as TaskDoc;

    let threadId = task.threadId;
    if (!threadId) {
      const threadRef = doc(collection(db, "threads"));
      t.set(threadRef, {
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

    return { threadId, taskTitle: task.title };
  });

  // Post-transaction side-effects (non-transactional writes)
  await logSystemEvent(`Task "${result.taskTitle}" submitted by ${memberName || memberUid}`, memberName || memberUid);
}

export async function approveTask(taskId: string, approverName: string) {
  if (!taskId) throw new Error("approveTask requires taskId");
  // Perform core updates in a transaction and return metadata for post-transaction logs
  const meta = await runTransaction(db, async (t) => {
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await t.get(taskRef);
    if (!taskSnap.exists()) throw new Error("Task not found");
    const task = taskSnap.data() as TaskDoc;

    const uid = task.assignedTo?.[0];
    if (!uid) throw new Error("approveTask: task has no assigned user");
    const walletRef = doc(db, "wallets", uid);
    t.update(walletRef, { totalPoints: increment(task.pointReward) });
    t.update(taskRef, { status: "approved" });

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

    return { uid, coupleId: task.coupleId, pointReward: task.pointReward, title: task.title };
  });

  // Post-transaction logging (non-transactional)
  if (meta.uid) {
    await logTransaction(meta.uid, meta.coupleId, "earned", meta.pointReward, `Completed task: ${meta.title}`);
  }
  await logSystemEvent(`Task "${meta.title}" approved by ${approverName}`, approverName);
}

export async function getStreakData(uid: string): Promise<StreakDoc | null> {
  try {
    if (!uid) throw new Error("getStreakData requires uid");
    const snap = await getDoc(doc(db, "streaks", uid));
    return snap.exists() ? snap.data() as StreakDoc : null;
  } catch (e) {
    return null;
  }
}

export async function linkPartner(uid: string, inviteCode: string): Promise<{ ok: boolean; relationshipId: string }> {
  if (!uid) throw new Error("linkPartner requires uid");
  if (!inviteCode) throw new Error("linkPartner requires inviteCode");
  const q = query(collection(db, "users"), where("inviteCode", "==", inviteCode), firestoreLimit(1));
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
  if (!taskId) throw new Error("rejectTask requires taskId");
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error("Task not found");
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
  if (!data || !data.fromUid || !data.toUid || !data.title || !data.coupleId) {
    throw new Error("startFavorRequest requires fromUid, toUid, title and coupleId");
  }

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
  if (!favorId) throw new Error("counterFavor requires favorId");
  if (typeof newCost !== 'number' || newCost < 0) throw new Error("counterFavor requires a valid newCost");

  await runTransaction(db, async (t) => {
    const favorRef = doc(db, "favorRequests", favorId);
    const favorSnap = await t.get(favorRef);
    if (!favorSnap.exists()) throw new Error("Favor not found");
    const favor = favorSnap.data() as FavorDoc;

    if (favor.currentRound >= 3) throw new Error("Maximum negotiation rounds reached (3-strike rule)");

    const nextRound = favor.currentRound + 1;
    t.update(favorRef, { proposedCost: newCost, currentRound: nextRound, status: "negotiating" });
    t.update(doc(db, "threads", favor.threadId), { title: `Favor: ${favor.title} (Round ${nextRound} of 3)` });
  });

  // Post-transaction logging
  await logSystemEvent(`Favor ${favorId} countered to ${newCost} by ${actorName}`, actorName);
}

export async function approveFavor(favorId: string, approverName: string) {
  if (!favorId) throw new Error("approveFavor requires favorId");
  const meta = await runTransaction(db, async (t) => {
    const favorRef = doc(db, "favorRequests", favorId);
    const favorSnap = await t.get(favorRef);
    if (!favorSnap.exists()) throw new Error("Favor not found");
    const favor = favorSnap.data() as FavorDoc;

    if (typeof favor.proposedCost !== 'number') throw new Error("Favor missing proposedCost");

    const walletRef = doc(db, "wallets", favor.fromUid);
    const walletSnap = await t.get(walletRef);
    if (!walletSnap.exists()) throw new Error("Wallet not found");
    const wallet = walletSnap.data() as WalletDoc;

    if (wallet.totalPoints < favor.proposedCost) throw new Error("Partner has insufficient points");
    if ((wallet.monthlyRedeemed || 0) + favor.proposedCost > 100) throw new Error("Partner's monthly cap reached");

    t.update(walletRef, { 
      totalPoints: increment(-favor.proposedCost),
      monthlyRedeemed: increment(favor.proposedCost)
    });
    
    t.update(favorRef, { status: "agreed", resolvedAt: serverTimestamp() });
    t.update(doc(db, "threads", favor.threadId), { title: `Favor: ${favor.title} (Approved)` });
    
    return { fromUid: favor.fromUid, coupleId: favor.coupleId, proposedCost: favor.proposedCost, title: favor.title };
  });

  // Post-transaction logging
  await logTransaction(meta.fromUid, meta.coupleId, "spent", meta.proposedCost, `Favor granted: ${meta.title}`);
  await logSystemEvent(`Favor "${meta.title}" approved by ${approverName}`, approverName);
}

export async function rejectFavor(favorId: string, rejectorName: string) {
  if (!favorId) throw new Error("rejectFavor requires favorId");
  const favorRef = doc(db, "favorRequests", favorId);
  const favorSnap = await getDoc(favorRef);
  if (!favorSnap.exists()) throw new Error("Favor not found");
  const favor = favorSnap.data() as FavorDoc;

  await updateDoc(favorRef, { status: "rejected", resolvedAt: serverTimestamp() });
  await updateDoc(doc(db, "threads", favor.threadId), { title: `Favor: ${favor.title} (Rejected)` });
  await logSystemEvent(`Favor "${favor.title}" rejected by ${rejectorName}`, rejectorName);
}

export async function getTransactions(uid: string): Promise<TransactionDoc[]> {
  if (!uid) throw new Error("getTransactions requires uid");
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

export async function getThreads(uid?: string): Promise<ThreadDoc[]> {
  let user = null;
  if (uid) {
    const snap = await getDoc(doc(db, "users", uid));
    user = snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserDoc) : null;
  } else {
    user = await getMe();
  }
  if (!user || !user.coupleId) return [];
  const q = query(collection(db, "threads"), where("coupleId", "==", user.coupleId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ThreadDoc));
}

export async function updateNickname(uid: string, nickname: string, actorName: string) {
  if (!uid) throw new Error("updateNickname requires uid");
  if (typeof nickname !== 'string') throw new Error("updateNickname requires nickname string");
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { nickname });
  await logSystemEvent(`${actorName} updated their nickname to "${nickname}"`, actorName);
}

export async function getPartnerData(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserDoc) : null;
}

export async function getThreadMessages(threadId: string): Promise<MessageDoc[]> {
  if (!threadId) throw new Error("getThreadMessages requires threadId");
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
  if (!uid) throw new Error("sendThreadMessage requires uid");
  if (!threadId) throw new Error("sendThreadMessage requires threadId");
  if (typeof text !== 'string' || text.trim() === '') throw new Error("sendThreadMessage requires non-empty text");
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
  if (!uid) throw new Error("toggleThreadReaction requires uid");
  if (!threadId) throw new Error("toggleThreadReaction requires threadId");
  if (!messageId) throw new Error("toggleThreadReaction requires messageId");
  if (!reaction) throw new Error("toggleThreadReaction requires reaction");
  const msgRef = doc(db, "threads", threadId, "messages", messageId);
  await runTransaction(db, async (t) => {
    const snap = await t.get(msgRef);
    if (!snap.exists()) throw new Error("Message not found");
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

// -------------------------
// Compatibility wrappers
// These adapt older/other module names used across the codebase
// to the implementations above.
// -------------------------

export async function getWallet(uid: string) {
  return getWalletData(uid);
}

export async function getTransactionsFor(uid: string, limit = 50) {
  const all = await getTransactions(uid);
  return Array.isArray(all) ? all.slice(0, limit) : [];
}

export async function getDecayHistoryFor(uid: string, count = 24) {
  if (!uid) return [];
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    where("type", "==", "decayed"),
    orderBy("timestamp", "desc"),
    firestoreLimit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMonthlySnapshotsFor(uid: string, count = 12) {
  if (!uid) return [];
  const q = query(
    collection(db, "monthlySnapshots"),
    where("ownerUid", "==", uid),
    orderBy("createdAt", "desc"),
    firestoreLimit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
