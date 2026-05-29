import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// HELPERS
// ============================================================================

const checkAuth = (auth: { uid: string } | undefined): string => {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Login required");
  return auth.uid;
};

const getMyCoupleId = async (uid: string): Promise<string | null> => {
  const user = await db.collection("users").doc(uid).get();
  return user.data()?.coupleId || null;
};

const logTransaction = async (
  uid: string, coupleId: string, type: string, delta: number, reason: string
) => {
  await db.collection("transactions").add({
    uid, coupleId, type, delta, reason,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const logAudit = async (action: string, uid: string, detail: string) => {
  await db.collection("auditLogs").add({
    action, uid, detail,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
};

// ============================================================================
// USER
// ============================================================================

export const getMe = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
});

export const getUser = onCall(async (req) => {
  checkAuth(req.auth);
  const snap = await db.collection("users").doc((req.data as any).uid).get();
  return snap.exists ? snap.data() : null;
});

export const getPartner = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const user = await db.collection("users").doc(uid).get();
  const coupleId = user.data()?.coupleId;
  if (!coupleId) return null;
  const partners = await db.collection("users").where("coupleId", "==", coupleId).get();
  const partner = partners.docs.find((d) => d.id !== uid);
  return partner ? partner.data() : null;
});

// ============================================================================
// WALLET
// ============================================================================

export const getWallet = onCall(async (req) => {
  checkAuth(req.auth);
  const snap = await db.collection("wallets").doc((req.data as any).uid).get();
  return snap.exists ? snap.data() : null;
});

export const getTransactionsFor = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  const limit = data.limit || 50;
  const snaps = await db.collection("transactions")
    .where("uid", "==", data.uid)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getMonthlySnapshotsFor = onCall(async (_req) => []);

export const getDecayHistoryFor = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  const limit = data.limit || 50;
  const snaps = await db.collection("transactions")
    .where("uid", "==", data.uid)
    .where("type", "==", "decayed")
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const awardPoints = onCall(async (req) => {
  const actorUid = checkAuth(req.auth);
  const { uid, amount, reason } = req.data as any;
  const user = await db.collection("users").doc(uid).get();
  const coupleId = user.data()?.coupleId;
  await db.collection("wallets").doc(uid).set(
    { totalPoints: admin.firestore.FieldValue.increment(amount) },
    { merge: true }
  );
  await logTransaction(uid, coupleId, "earned", amount, reason);
  await logAudit("points.award", actorUid, `Awarded ${amount} to ${uid}`);
  return { ok: true };
});

export const redeemPoints = onCall(async (req) => {
  const actorUid = checkAuth(req.auth);
  const { uid, amount, reason } = req.data as any;
  const user = await db.collection("users").doc(uid).get();
  const coupleId = user.data()?.coupleId;
  await db.collection("wallets").doc(uid).update({
    totalPoints: admin.firestore.FieldValue.increment(-amount),
    monthlyRedeemed: admin.firestore.FieldValue.increment(amount),
  });
  await logTransaction(uid, coupleId, "spent", -amount, reason);
  await logAudit("points.redeem", actorUid, `Redeemed ${amount} from ${uid}`);
  return { ok: true };
});

// ============================================================================
// TASKS
// ============================================================================

export const getTasksForUser = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  const snaps = await db.collection("tasks").where("assignedTo", "==", data.uid).get();
  return snaps.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((t: any) => t.status !== "archived");
});

export const getActiveTasks = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  const snaps = await db.collection("tasks")
    .where("assignedTo", "==", data.uid)
    .where("status", "==", "active")
    .get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getPendingApprovals = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const coupleId = await getMyCoupleId(uid);
  const snaps = await db.collection("taskSubmissions")
    .where("coupleId", "==", coupleId)
    .where("status", "==", "pending")
    .get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getMyAchievements = onCall(async (_req) => []);

export const completeTask = onCall(async (req) => {
  checkAuth(req.auth);
  await db.collection("tasks").doc((req.data as any).taskId).update({ status: "pending" });
  return { ok: true };
});

export const submitTaskCompletion = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  const coupleId = await getMyCoupleId(uid);
  await db.collection("taskSubmissions").add({
    taskId: data.taskId,
    uid,
    coupleId,
    submissionNote: data.submissionNote || "",
    status: "pending",
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const approveTaskSubmission = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  const subRef = db.collection("taskSubmissions").doc(data.submissionId);
  const sub = await subRef.get();
  const submissionData = sub.data();
  if (!submissionData) throw new HttpsError("not-found", "Submission missing");
  const taskRef = db.collection("tasks").doc(submissionData.taskId);
  const task = await taskRef.get();
  const points = task.data()?.rewardValue || 0;
  const batch = db.batch();
  batch.update(subRef, { status: "approved" });
  batch.update(taskRef, { status: "approved" });
  await batch.commit();
  await db.collection("wallets").doc(submissionData.uid).set(
    { totalPoints: admin.firestore.FieldValue.increment(points) },
    { merge: true }
  );
  await logTransaction(submissionData.uid, submissionData.coupleId, "earned", points, "Task approved");
  await logAudit("task.approve", uid, `Approved submission ${data.submissionId}`);
  return { ok: true };
});

export const rejectTaskSubmission = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  const subRef = db.collection("taskSubmissions").doc(data.submissionId);
  const subSnap = await subRef.get();
  if (!subSnap.exists) throw new HttpsError("not-found", "Submission not found");

  const taskId = subSnap.data()?.taskId;
  const batch = db.batch();
  batch.update(subRef, { status: "rejected" });
  if (taskId) {
    batch.update(db.collection("tasks").doc(taskId), { status: "rejected" });
  }
  await batch.commit();
  return { ok: true };
});

export const getSubmissionTask = onCall(async (req) => {
  checkAuth(req.auth);
  const snap = await db.collection("taskSubmissions").doc((req.data as any).submissionId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
});

export const revealTask = onCall(async (_req) => ({ ok: true }));
export const revealSurpriseTask = onCall(async (_req) => ({ ok: true }));

export const getAdminTasks = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const coupleId = await getMyCoupleId(uid);
  const snaps = await db.collection("tasks").where("coupleId", "==", coupleId).get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const archiveTaskViaAdmin = onCall(async (req) => {
  checkAuth(req.auth);
  await db.collection("tasks").doc((req.data as any).taskId).update({ status: "archived" });
  return { ok: true };
});

export const createTaskViaAdmin = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  const coupleId = await getMyCoupleId(uid);
  const user = await db.collection("users").doc(uid).get();
  const partnerId = user.data()?.partnerId;
  await db.collection("tasks").add({
    coupleId,
    assignedTo: data.assignedTo || partnerId,
    title: data.title,
    prompt: data.prompt,
    category: data.category,
    difficulty: data.difficulty,
    rewardValue: data.rewardValue,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

// ============================================================================
// THREADS
// ============================================================================

export const getThreads = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const coupleId = await getMyCoupleId(uid);
  const snaps = await db.collection("threads").where("coupleId", "==", coupleId).get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getThreadMessages = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  const snaps = await db.collection("threads").doc(data.threadId)
    .collection("messages").orderBy("timestamp", "asc").get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const sendThreadMessage = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  await db.collection("threads").doc(data.threadId).collection("messages").add({
    senderUid: uid,
    text: data.text,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const toggleThreadReaction = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const { threadId, messageId, emoji } = req.data as any;
  const msgRef = db.collection("threads").doc(threadId).collection("messages").doc(messageId);
  await db.runTransaction(async (t) => {
    const doc = await t.get(msgRef);
    const reactions = doc.data()?.reactions || {};
    const users: string[] = reactions[emoji] || [];
    const index = users.indexOf(uid);
    if (index > -1) users.splice(index, 1);
    else users.push(uid);
    t.update(msgRef, { [`reactions.${emoji}`]: users });
  });
  return { ok: true };
});

export const toggleReaction = toggleThreadReaction;

// ============================================================================
// FAVORS
// ============================================================================

export const getFavorRequests = onCall(async (req) => {
  checkAuth(req.auth);
  const snaps = await db.collection("favorRequests")
    .where("uid", "==", (req.data as any).uid).get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getFavorRequestsToReview = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const coupleId = await getMyCoupleId(uid);
  const snaps = await db.collection("favorRequests")
    .where("coupleId", "==", coupleId).get();
  return snaps.docs
    .filter((d) => d.data().uid !== uid)
    .map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getFavorRequest = onCall(async (req) => {
  checkAuth(req.auth);
  const snap = await db.collection("favorRequests").doc((req.data as any).favorRequestId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
});

export const getNegotiationsFor = onCall(async (req) => {
  checkAuth(req.auth);
  const snaps = await db.collection("favorRequests")
    .doc((req.data as any).favorRequestId).collection("negotiations").get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const submitFavorRequest = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  const coupleId = await getMyCoupleId(uid);
  await db.collection("favorRequests").add({
    uid, coupleId,
    title: data.title,
    description: data.description,
    tier: data.tier || "pending",
    pointCost: data.pointCost || 0,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const assignFavorTier = onCall(async (req) => {
  checkAuth(req.auth);
  const data = req.data as any;
  await db.collection("favorRequests").doc(data.id).update({ tier: data.tier });
  return { ok: true };
});

export const proposeFavorCounter = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  const favorRef = db.collection("favorRequests").doc(data.favorRequestId);
  await favorRef.collection("negotiations").add({
    uid,
    pointCost: data.pointCost,
    note: data.note,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await favorRef.update({ status: "countered" });
  return { ok: true };
});

export const acceptFavorAgreement = onCall(async (req) => {
  const actorUid = checkAuth(req.auth);
  const data = req.data as any;
  const favorRef = db.collection("favorRequests").doc(data.favorRequestId);
  const favorSnap = await favorRef.get();
  const favorData = favorSnap.data();
  if (!favorData) throw new HttpsError("not-found", "Favor not found");
  const cost = favorData.pointCost || 0;
  await db.collection("wallets").doc(favorData.uid).update({
    totalPoints: admin.firestore.FieldValue.increment(-cost),
  });
  await favorRef.update({ status: "agreed" });
  await logTransaction(favorData.uid, favorData.coupleId, "spent", -cost, `Favor agreed: ${favorData.title}`);
  await logAudit("favor.accept", actorUid, `Accepted favor ${data.favorRequestId}`);
  return { ok: true };
});

export const rejectFavorRequest = onCall(async (req) => {
  checkAuth(req.auth);
  await db.collection("favorRequests").doc((req.data as any).favorRequestId).update({ status: "rejected" });
  return { ok: true };
});

export const sendFavorThreadMessage = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const data = req.data as any;
  await db.collection("favorRequests").doc(data.id).collection("thread").add({
    senderUid: uid,
    text: data.text,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const toggleFavorThreadReaction = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const { favorId, messageId, emoji } = req.data as any;
  const msgRef = db.collection("favorRequests").doc(favorId).collection("thread").doc(messageId);
  await db.runTransaction(async (t) => {
    const doc = await t.get(msgRef);
    const reactions = doc.data()?.reactions || {};
    const users: string[] = reactions[emoji] || [];
    const index = users.indexOf(uid);
    if (index > -1) users.splice(index, 1);
    else users.push(uid);
    t.update(msgRef, { [`reactions.${emoji}`]: users });
  });
  return { ok: true };
});

export const respondToFavorRequest = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const { action, id, favorRequestId, tier, pointCost, note } = req.data as any;
  const fId = id || favorRequestId;
  if (action === "counter") {
    if (tier) await db.collection("favorRequests").doc(fId).update({ tier });
    await db.collection("favorRequests").doc(fId).collection("negotiations").add({
      uid, pointCost, note,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("favorRequests").doc(fId).update({ status: "countered" });
  } else if (action === "accept") {
    const favorSnap = await db.collection("favorRequests").doc(fId).get();
    const favorData = favorSnap.data();
    if (favorData) {
      await db.collection("wallets").doc(favorData.uid).update({
        totalPoints: admin.firestore.FieldValue.increment(-favorData.pointCost),
      });
      await db.collection("favorRequests").doc(fId).update({ status: "agreed" });
    }
  } else if (action === "reject") {
    await db.collection("favorRequests").doc(fId).update({ status: "rejected" });
  }
  return { ok: true };
});

export const respondToCounter = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const { action, favorRequestId } = req.data as any;
  if (action === "accept") {
    const favorSnap = await db.collection("favorRequests").doc(favorRequestId).get();
    const favorData = favorSnap.data();
    if (favorData) {
      await db.collection("wallets").doc(favorData.uid).update({
        totalPoints: admin.firestore.FieldValue.increment(-favorData.pointCost),
      });
      await db.collection("favorRequests").doc(favorRequestId).update({ status: "agreed" });
    }
  } else {
    await db.collection("favorRequests").doc(favorRequestId).update({ status: "rejected" });
  }
  void uid;
  return { ok: true };
});

// ============================================================================
// STREAKS
// ============================================================================

export const getStreak = onCall(async (req) => {
  checkAuth(req.auth);
  const snap = await db.collection("streaks").doc((req.data as any).uid).get();
  return snap.exists ? snap.data() : null;
});

export const updateStreak = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const streakRef = db.collection("streaks").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const todayStr = new Date().toISOString().split("T")[0];
  await db.runTransaction(async (t) => {
    const snap = await t.get(streakRef);
    const streak = snap.data() || { currentStreak: 0, longestStreak: 0, lastStreakDate: "" };
    if (streak.lastStreakDate === todayStr) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const newStreak = streak.lastStreakDate === yesterdayStr ? streak.currentStreak + 1 : 1;
    const longest = Math.max(newStreak, streak.longestStreak);
    const updateData = { currentStreak: newStreak, longestStreak: longest, lastStreakDate: todayStr };
    t.set(streakRef, updateData, { merge: true });
    t.update(userRef, updateData);
  });
  return { ok: true };
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const getNotificationsFor = onCall(async (req) => {
  checkAuth(req.auth);
  const snaps = await db.collection("notifications")
    .where("uid", "==", (req.data as any).uid)
    .orderBy("createdAt", "desc")
    .get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const markNotificationRead = onCall(async (req) => {
  checkAuth(req.auth);
  await db.collection("notifications").doc((req.data as any).notificationId).update({ read: true });
  return { ok: true };
});

// ============================================================================
// PARTNER MANAGEMENT
// ============================================================================

export const linkPartner = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const { inviteCode } = req.data as any;
  const partnerQuery = await db.collection("users").where("inviteCode", "==", inviteCode).limit(1).get();
  if (partnerQuery.empty) throw new HttpsError("not-found", "Invalid invite code");
  const partnerDoc = partnerQuery.docs[0];
  const partnerData = partnerDoc.data();
  if (partnerData.coupleId) throw new HttpsError("already-exists", "Partner already linked");
  const coupleId = `couple_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const batch = db.batch();
  batch.update(db.collection("users").doc(uid), { coupleId, partnerId: partnerDoc.id });
  batch.update(partnerDoc.ref, { coupleId, partnerId: uid, inviteCode: null });
  await batch.commit();
  await logAudit("partner.link", uid, `Linked with ${partnerDoc.id}`);
  return { ok: true, relationshipId: coupleId };
});

export const unlinkPartner = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const user = await db.collection("users").doc(uid).get();
  const partnerId = user.data()?.partnerId;
  const batch = db.batch();
  batch.update(db.collection("users").doc(uid), { coupleId: null, partnerId: null });
  if (partnerId) {
    batch.update(db.collection("users").doc(partnerId), { coupleId: null, partnerId: null });
  }
  await batch.commit();
  return { ok: true };
});

export const regenerateInviteCode = onCall(async (req) => {
  const uid = checkAuth(req.auth);
  const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  await db.collection("users").doc(uid).update({ inviteCode: newCode });
  return { ok: true, inviteCode: newCode };
});

export const getNormalUsers = onCall(async (req) => {
  checkAuth(req.auth);
  const snaps = await db.collection("users").where("role", "!=", "admin").get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

// ============================================================================
// ADMIN
// ============================================================================

export const getAdminStats = onCall(async (req) => {
  checkAuth(req.auth);
  const [users, tasks, favors] = await Promise.all([
    db.collection("users").get(),
    db.collection("tasks").get(),
    db.collection("favorRequests").get(),
  ]);
  return { users: users.size, tasks: tasks.size, favorRequests: favors.size };
});

export const getAuditLogs = onCall(async (req) => {
  checkAuth(req.auth);
  const limit = (req.data as any).limit || 50;
  const snaps = await db.collection("auditLogs").orderBy("timestamp", "desc").limit(limit).get();
  return snaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const getAdminAnalytics = onCall(async (_req) => ({}));
export const getSystemHealth = onCall(async (_req) => ({ status: "ok" }));
