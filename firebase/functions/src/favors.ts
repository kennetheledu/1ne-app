import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import type { FavorRequestDoc, FavorTier, NegotiationDoc, ThreadMessageDoc, UserDoc } from "./types";
import { assertSelfNonAdmin } from "./points";

const db = admin.firestore();
const FAVOR_TIER_POINTS: Record<FavorTier, number> = { easy: 2, medium: 4, hard: 6 };

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

async function getUserOrThrow(uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  return snap.data() as UserDoc;
}

async function assertLinked(authUid: string | undefined, uid: string) {
  if (!authUid || authUid !== uid) {
    throw new HttpsError("permission-denied", "Action not allowed.");
  }
  const user = await getUserOrThrow(uid);
  if (!user.relationshipId || !user.partnerId) {
    throw new HttpsError("failed-precondition", "You must be linked to a partner.");
  }
  const partner = await getUserOrThrow(user.partnerId);
  return { user, partner };
}

export async function submitFavorRequest(uid: string, title: string, description: string, authUid: string | undefined) {
  const { user, partner } = await assertLinked(authUid, uid);
  await assertSelfNonAdmin(authUid, uid);
  const doc: FavorRequestDoc = {
    relationshipId: user.relationshipId!,
    requesterUid: uid,
    reviewerUid: partner.uid,
    title,
    description,
    status: "pending_review",
    assignedTier: null,
    assignedPointCost: null,
    currentPointCost: null,
    lastProposalBy: null,
    threadId: null,
    agreementId: null,
    rejectionNote: null,
    createdAt: serverTimestamp(),
    reviewedAt: null,
    updatedAt: serverTimestamp(),
  };
  await db.collection("favorRequests").doc().set(doc);
}

export async function assignFavorTier(uid: string, favorRequestId: string, tier: FavorTier, note: string, authUid: string | undefined) {
  await assertSelfNonAdmin(authUid, uid);
  const { user } = await assertLinked(authUid, uid);
  const ref = db.collection("favorRequests").doc(favorRequestId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Favor request not found.");
  const request = snap.data() as FavorRequestDoc;
  if (request.reviewerUid !== uid) throw new HttpsError("permission-denied", "Only reviewer can assign tier.");
  const points = FAVOR_TIER_POINTS[tier];
  const threadId = request.threadId ?? `favor_thread_${favorRequestId}`;
  await ref.update({
    status: "negotiating",
    assignedTier: tier,
    assignedPointCost: points,
    currentPointCost: points,
    lastProposalBy: uid,
    threadId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const negotiation: NegotiationDoc = {
    favorRequestId,
    relationshipId: request.relationshipId,
    proposerUid: uid,
    proposalType: "tier",
    note,
    proposedPointCost: points,
    proposedTier: tier,
    createdAt: serverTimestamp(),
  };
  await db.collection("negotiations").doc().set(negotiation);
  const message: ThreadMessageDoc = {
    favorRequestId,
    threadId,
    senderUid: uid,
    text: `Assigned ${tier} tier at ${points} points. ${note}`,
    reactions: {},
    createdAt: serverTimestamp(),
  };
  await db.collection("threadMessages").doc().set(message);
  void user;
}

export async function proposeFavorCounter(uid: string, favorRequestId: string, pointCost: number, note: string, authUid: string | undefined) {
  await assertSelfNonAdmin(authUid, uid);
  const { user } = await assertLinked(authUid, uid);
  const ref = db.collection("favorRequests").doc(favorRequestId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Favor request not found.");
  const request = snap.data() as FavorRequestDoc;
  if (request.requesterUid !== uid && request.reviewerUid !== uid) {
    throw new HttpsError("permission-denied", "Only participants can counter.");
  }
  await ref.update({ currentPointCost: pointCost, lastProposalBy: uid, updatedAt: serverTimestamp() });
  await db.collection("negotiations").doc().set({
    favorRequestId,
    relationshipId: request.relationshipId,
    proposerUid: uid,
    proposalType: "counter",
    note,
    proposedPointCost: pointCost,
    proposedTier: request.assignedTier,
    createdAt: serverTimestamp(),
  });
  await db.collection("threadMessages").doc().set({
    favorRequestId,
    threadId: request.threadId ?? `favor_thread_${favorRequestId}`,
    senderUid: uid,
    text: `Counter offer: ${pointCost} points. ${note}`,
    reactions: {},
    createdAt: serverTimestamp(),
  });
  void user;
}

export async function sendFavorThreadMessage(uid: string, favorRequestId: string, text: string, authUid: string | undefined) {
  await assertLinked(authUid, uid);
  const requestSnap = await db.collection("favorRequests").doc(favorRequestId).get();
  if (!requestSnap.exists) throw new HttpsError("not-found", "Favor request not found.");
  const request = requestSnap.data() as FavorRequestDoc;
  await db.collection("threadMessages").doc().set({
    favorRequestId,
    threadId: request.threadId ?? `favor_thread_${favorRequestId}`,
    senderUid: uid,
    text,
    reactions: {},
    createdAt: serverTimestamp(),
  });
}

export async function toggleFavorThreadReaction(uid: string, messageId: string, reaction: string, authUid: string | undefined) {
  await assertLinked(authUid, uid);
  const ref = db.collection("threadMessages").doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Message not found.");
  const data = snap.data()!;
  const existing: string[] = data.reactions?.[uid] ?? [];
  const has = existing.includes(reaction);
  const next = has ? existing.filter((r) => r !== reaction) : [...existing, reaction];
  await ref.update({ [`reactions.${uid}`]: next });
}

export async function rejectFavorRequest(uid: string, favorRequestId: string, note: string, authUid: string | undefined) {
  await assertSelfNonAdmin(authUid, uid);
  const requestRef = db.collection("favorRequests").doc(favorRequestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new HttpsError("not-found", "Favor request not found.");
  const request = requestSnap.data() as FavorRequestDoc;
  if (request.reviewerUid !== uid) throw new HttpsError("permission-denied", "Only reviewer can reject.");
  await requestRef.update({ status: "rejected", rejectionNote: note, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function acceptFavorAgreement(uid: string, favorRequestId: string, authUid: string | undefined) {
  await assertSelfNonAdmin(authUid, uid);
  const requestRef = db.collection("favorRequests").doc(favorRequestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new HttpsError("not-found", "Favor request not found.");
  const request = requestSnap.data() as FavorRequestDoc;
  if (request.requesterUid !== uid && request.reviewerUid !== uid) {
    throw new HttpsError("permission-denied", "Only participants can finalize.");
  }
  if (!request.currentPointCost) throw new HttpsError("failed-precondition", "No active point proposal.");
  // In production: run a Firestore transaction, verify wallet balance/cap, deduct requester points,
  // append immutable transaction + audit log, then create /agreements doc and update /favorRequests.
  await db.collection("agreements").doc().set({
    favorRequestId,
    relationshipId: request.relationshipId,
    requesterUid: request.requesterUid,
    reviewerUid: request.reviewerUid,
    finalPointCost: request.currentPointCost,
    finalTier: request.assignedTier,
    acceptedProposalId: null,
    finalizedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  await requestRef.update({ status: "agreed", updatedAt: serverTimestamp() });
}
