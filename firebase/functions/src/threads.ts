import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import type { UserDoc } from "./types";
import { assertSelfNonAdmin, awardPoints } from "./points";

const db = admin.firestore();

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

async function getUserOrThrow(uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  return snap.data() as UserDoc;
}

async function assertLinked(authUid: string | undefined, targetUid: string) {
  if (!authUid || authUid !== targetUid) {
    throw new HttpsError("permission-denied", "Action not allowed.");
  }
  const user = await getUserOrThrow(targetUid);
  if (!user.relationshipId || !user.partnerId) {
    throw new HttpsError("failed-precondition", "You must be linked to a partner.");
  }
  const partner = await getUserOrThrow(user.partnerId);
  return { user, partner };
}

async function getOrCreateThread(user: UserDoc, partner: UserDoc) {
  const existing = await db.collection("threads")
    .where("relationshipId", "==", user.relationshipId)
    .limit(1)
    .get();
  if (!existing.empty) return existing.docs[0];

  const ref = db.collection("threads").doc();
  await ref.set({
    relationshipId: user.relationshipId,
    participantA: user.uid,
    participantB: partner.uid,
    lastMessageText: "",
    lastMessageAt: serverTimestamp(),
    lastMessageBy: null,
    messageCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.get().then((s) => s);
}

export async function sendMessage(
  uid: string,
  text: string,
  authUid: string | undefined,
  replyToId?: string,
  submissionId?: string
) {
  const { user, partner } = await assertLinked(authUid, uid);
  if (!text.trim()) throw new HttpsError("invalid-argument", "Message empty.");
  if (text.length > 2000) throw new HttpsError("invalid-argument", "Too long.");

  const threadSnap = await getOrCreateThread(user, partner);
  const threadRef = threadSnap.ref;
  const batch = db.batch();

  batch.create(db.collection("messages").doc(), {
    threadId: threadRef.id,
    senderUid: uid,
    text: text.trim(),
    reactions: {},
    replyToId: replyToId ?? null,
    submissionId: submissionId ?? null,
    createdAt: serverTimestamp(),
  });

  batch.update(threadRef, {
    lastMessageText: text.trim().slice(0, 100),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: uid,
    messageCount: admin.firestore.FieldValue.increment(1),
  });

  batch.create(db.collection("notifications").doc(), {
    userId: partner.uid,
    title: `${user.displayName}: ${text.trim().slice(0, 60)}`,
    body: text.trim().slice(0, 140),
    type: "thread",
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function toggleReaction(
  uid: string,
  messageId: string,
  reaction: string,
  authUid: string | undefined
) {
  await assertLinked(authUid, uid);
  const ref = db.collection("messages").doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Message not found.");
  const data = snap.data()!;
  const existing: string[] = data.reactions?.[uid] ?? [];
  const has = existing.includes(reaction);
  const next = has ? existing.filter((r: string) => r !== reaction) : [...existing, reaction];
  await ref.update({ [`reactions.${uid}`]: next });
}

export async function submitForApproval(
  uid: string,
  taskId: string,
  note: string,
  authUid: string | undefined
) {
  const { user, partner } = await assertLinked(authUid, uid);
  await assertSelfNonAdmin(authUid, uid);

  const taskSnap = await db.collection("tasks").doc(taskId).get();
  if (!taskSnap.exists) throw new HttpsError("not-found", "Task not found.");
  const task = taskSnap.data()!;
  if (task.ownerUid !== uid) throw new HttpsError("permission-denied", "Not your task.");
  if (task.status !== "pending") throw new HttpsError("failed-precondition", "Task not pending.");

  const threadSnap = await getOrCreateThread(user, partner);
  const batch = db.batch();

  const subRef = db.collection("taskSubmissions").doc();
  batch.set(subRef, {
    taskId,
    taskTitle: task.title,
    taskCategory: task.category,
    submitterUid: uid,
    reviewerUid: partner.uid,
    relationshipId: user.relationshipId,
    status: "pending",
    note: note.trim(),
    rewardValue: task.rewardValue,
    rejectionNote: null,
    counterNote: null,
    counterRewardValue: null,
    threadId: threadSnap.ref.id,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: serverTimestamp(),
  });

  batch.create(db.collection("messages").doc(), {
    threadId: threadSnap.ref.id,
    senderUid: uid,
    text: `📋 Submitted "${task.title}" for approval: ${note.trim().slice(0, 200)}`,
    reactions: {},
    replyToId: null,
    submissionId: subRef.id,
    createdAt: serverTimestamp(),
  });

  batch.create(db.collection("notifications").doc(), {
    userId: partner.uid,
    title: `${user.displayName} wants approval`,
    body: `Task "${task.title}" submitted for your review.`,
    type: "approval",
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function approveSubmission(
  uid: string,
  submissionId: string,
  authUid: string | undefined
) {
  await assertSelfNonAdmin(authUid, uid);
  const { user } = await assertLinked(authUid, uid);

  const ref = db.collection("taskSubmissions").doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Submission not found.");
  const sub = snap.data()!;
  if (sub.reviewerUid !== uid) throw new HttpsError("permission-denied", "Not the reviewer.");
  if (sub.status !== "pending") throw new HttpsError("failed-precondition", "Not pending.");

  await ref.update({ status: "approved", reviewedAt: serverTimestamp(), reviewedBy: uid });
  await db.collection("tasks").doc(sub.taskId).update({
    status: "completed",
    completedAt: admin.firestore.Timestamp.now(),
    completedBy: sub.submitterUid,
  });

  await awardPoints(sub.submitterUid, sub.rewardValue, `Approved task: ${sub.taskTitle}`, uid);

  if (sub.threadId) {
    await db.collection("messages").doc().create({
      threadId: sub.threadId,
      senderUid: uid,
      text: `✅ Approved "${sub.taskTitle}" — ${sub.rewardValue} points awarded!`,
      reactions: {},
      replyToId: null,
      submissionId,
      createdAt: serverTimestamp(),
    });
  }

  await db.collection("notifications").doc().create({
    userId: sub.submitterUid,
    title: "Task approved! 🎉",
    body: `${user.displayName} approved "${sub.taskTitle}" — ${sub.rewardValue} points earned!`,
    type: "approval",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function rejectSubmission(
  uid: string,
  submissionId: string,
  rejectionNote: string,
  authUid: string | undefined
) {
  await assertSelfNonAdmin(authUid, uid);
  const { user } = await assertLinked(authUid, uid);

  const ref = db.collection("taskSubmissions").doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Submission not found.");
  const sub = snap.data()!;
  if (sub.reviewerUid !== uid) throw new HttpsError("permission-denied", "Not the reviewer.");
  if (sub.status !== "pending") throw new HttpsError("failed-precondition", "Not pending.");

  const note = rejectionNote.trim() || "No reason given.";
  await ref.update({ status: "rejected", rejectionNote: note, reviewedAt: serverTimestamp(), reviewedBy: uid });

  if (sub.threadId) {
    await db.collection("messages").doc().create({
      threadId: sub.threadId,
      senderUid: uid,
      text: `❌ Rejected "${sub.taskTitle}" — ${note}`,
      reactions: {},
      replyToId: null,
      submissionId,
      createdAt: serverTimestamp(),
    });
  }

  await db.collection("notifications").doc().create({
    userId: sub.submitterUid,
    title: "Submission rejected",
    body: `"${sub.taskTitle}" was not approved: ${note}`,
    type: "approval",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function counterSubmission(
  uid: string,
  submissionId: string,
  counterNote: string,
  counterRewardValue: number,
  authUid: string | undefined
) {
  await assertSelfNonAdmin(authUid, uid);
  const { user } = await assertLinked(authUid, uid);

  const ref = db.collection("taskSubmissions").doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Submission not found.");
  const sub = snap.data()!;
  if (sub.reviewerUid !== uid) throw new HttpsError("permission-denied", "Not the reviewer.");
  if (sub.status !== "pending") throw new HttpsError("failed-precondition", "Not pending.");

  const note = counterNote.trim() || "Counter-proposal.";
  const val = Math.max(0, Math.floor(counterRewardValue));
  await ref.update({
    status: "countered",
    counterNote: note,
    counterRewardValue: val,
    reviewedAt: serverTimestamp(),
    reviewedBy: uid,
  });

  if (sub.threadId) {
    await db.collection("messages").doc().create({
      threadId: sub.threadId,
      senderUid: uid,
      text: `🔄 Counter on "${sub.taskTitle}" — ${val} pts proposed: ${note}`,
      reactions: {},
      replyToId: null,
      submissionId,
      createdAt: serverTimestamp(),
    });
  }

  await db.collection("notifications").doc().create({
    userId: sub.submitterUid,
    title: "Counter-proposal received",
    body: `${user.displayName} countered "${sub.taskTitle}" at ${val} points: ${note}`,
    type: "approval",
    read: false,
    createdAt: serverTimestamp(),
  });
}
