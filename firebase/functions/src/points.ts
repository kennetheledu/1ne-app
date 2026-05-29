import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import type { MonthlySnapshotDoc, TransactionDoc, UserDoc, WalletDoc } from "./types";

const db = admin.firestore();
const MONTHLY_CAP = 10;
const DECAY_RATE = 0.2;

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function previousDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

function monthIndex(key: string) {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
}

function nextMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1);
  return monthKey(d);
}

async function getUserOrThrow(uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  return snap.data() as UserDoc;
}

export async function assertSelfNonAdmin(authUid: string | undefined, targetUid: string) {
  if (!authUid || authUid !== targetUid) {
    throw new HttpsError("permission-denied", "You can only mutate your own wallet.");
  }
  const user = await getUserOrThrow(targetUid);
  if (user.role === "admin") {
    throw new HttpsError("permission-denied", "Admins cannot manipulate points.");
  }
  return user;
}

async function getOrCreateWallet(user: UserDoc): Promise<WalletDoc> {
  const ref = db.collection("wallets").doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as WalletDoc;

  const fresh: WalletDoc = {
    ownerUid: user.uid,
    relationshipId: user.relationshipId,
    balance: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    lifetimeDecayed: 0,
    monthlyRedeemed: 0,
    monthlyCap: MONTHLY_CAP,
    currentMonthKey: monthKey(),
    currentMonthStartedBalance: 0,
    monthlyEarned: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastStreakDate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await ref.set(fresh);
  return { ...fresh, createdAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now() };
}

function walletRef(uid: string) {
  return db.collection("wallets").doc(uid);
}

function transactionsRef() {
  return db.collection("transactions");
}

function snapshotsRef() {
  return db.collection("monthlySnapshots");
}

function notificationRef() {
  return db.collection("notifications");
}

function auditRef() {
  return db.collection("auditLogs");
}

function makeTransaction(
  wallet: WalletDoc,
  input: Omit<TransactionDoc, "walletId" | "ownerUid" | "relationshipId" | "source" | "immutable" | "createdAt">
): TransactionDoc {
  return {
    walletId: wallet.ownerUid,
    ownerUid: wallet.ownerUid,
    relationshipId: wallet.relationshipId,
    source: "cloud-function",
    immutable: true,
    createdAt: serverTimestamp(),
    ...input,
  };
}

function makeAudit(action: string, actor: string, target: string, meta?: Record<string, unknown>) {
  return {
    actor,
    action,
    target,
    meta: meta ?? null,
    createdAt: serverTimestamp(),
  };
}

async function applyOneMonthRollover(user: UserDoc, wallet: WalletDoc) {
  const preDecayClosingBalance = Math.max(
    0,
    wallet.currentMonthStartedBalance + wallet.monthlyEarned - wallet.monthlyRedeemed
  );
  const decayed = Math.floor(preDecayClosingBalance * DECAY_RATE);
  const closingBalance = Math.max(0, preDecayClosingBalance - decayed);

  const snapshot: MonthlySnapshotDoc = {
    walletId: user.uid,
    ownerUid: user.uid,
    relationshipId: user.relationshipId,
    monthKey: wallet.currentMonthKey,
    openingBalance: wallet.currentMonthStartedBalance,
    earned: wallet.monthlyEarned,
    redeemed: wallet.monthlyRedeemed,
    decayed,
    preDecayClosingBalance,
    closingBalance,
    redemptionCap: wallet.monthlyCap,
    redemptionUsed: wallet.monthlyRedeemed,
    redemptionRemaining: Math.max(0, wallet.monthlyCap - wallet.monthlyRedeemed),
    currentStreak: wallet.currentStreak,
    lifetimeEarnedAtClose: wallet.lifetimeEarned,
    createdAt: serverTimestamp(),
  };

  const nextWallet: WalletDoc = {
    ...wallet,
    relationshipId: user.relationshipId,
    balance: closingBalance,
    lifetimeDecayed: wallet.lifetimeDecayed + decayed,
    monthlyRedeemed: 0,
    currentMonthStartedBalance: closingBalance,
    monthlyEarned: 0,
    currentMonthKey: nextMonthKey(wallet.currentMonthKey),
    updatedAt: serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(snapshotsRef().doc(`${user.uid}_${wallet.currentMonthKey}`), snapshot, { merge: true });
  batch.set(walletRef(user.uid), nextWallet, { merge: true });

  if (decayed > 0) {
    batch.create(
      transactionsRef().doc(),
      makeTransaction(nextWallet, {
        kind: "decay",
        delta: -decayed,
        amount: decayed,
        balanceAfter: closingBalance,
        reason: `20% rollover decay for ${wallet.currentMonthKey}`,
        createdBy: null,
        monthKey: wallet.currentMonthKey,
        metadata: { preDecayClosingBalance, decayRate: DECAY_RATE },
      })
    );
    batch.create(notificationRef().doc(), {
      userId: user.uid,
      title: `Monthly rollover for ${wallet.currentMonthKey}`,
      body: `${decayed} point(s) decayed. New balance: ${closingBalance}.`,
      type: "wallet",
      read: false,
      createdAt: serverTimestamp(),
    });
    batch.create(auditRef().doc(), makeAudit("wallet.decay", user.uid, user.uid, { monthKey: wallet.currentMonthKey, decayed }));
  }

  await batch.commit();
  return { ...nextWallet, balance: closingBalance, lifetimeDecayed: wallet.lifetimeDecayed + decayed, monthlyRedeemed: 0, monthlyEarned: 0, currentMonthStartedBalance: closingBalance, currentMonthKey: nextMonthKey(wallet.currentMonthKey) };
}

export async function ensureWalletCurrent(user: UserDoc, wallet: WalletDoc, now = new Date()) {
  let current = wallet;
  const target = monthKey(now);
  while (monthIndex(current.currentMonthKey) < monthIndex(target)) {
    current = await applyOneMonthRollover(user, current);
  }
  return current;
}

export async function awardPoints(uid: string, amount: number, reason: string, actorUid: string) {
  const user = await getUserOrThrow(uid);
  const baseWallet = await getOrCreateWallet(user);
  const wallet = await ensureWalletCurrent(user, baseWallet);
  const next: WalletDoc = {
    ...wallet,
    relationshipId: user.relationshipId,
    balance: wallet.balance + amount,
    lifetimeEarned: wallet.lifetimeEarned + amount,
    monthlyEarned: wallet.monthlyEarned + amount,
    updatedAt: serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(walletRef(uid), next, { merge: true });
  batch.create(
    transactionsRef().doc(),
    makeTransaction(next, {
      kind: "award",
      delta: amount,
      amount,
      balanceAfter: wallet.balance + amount,
      reason,
      createdBy: actorUid,
      monthKey: next.currentMonthKey,
    })
  );
  batch.create(auditRef().doc(), makeAudit("wallet.award", actorUid, uid, { amount, reason }));
  await batch.commit();
}

export async function redeemPoints(uid: string, amount: number, reason: string, actorUid: string) {
  const user = await getUserOrThrow(uid);
  const baseWallet = await getOrCreateWallet(user);
  const wallet = await ensureWalletCurrent(user, baseWallet);

  if (wallet.monthlyRedeemed + amount > wallet.monthlyCap) {
    throw new HttpsError("failed-precondition", "Monthly redemption cap exceeded.");
  }
  if (wallet.balance < amount) {
    throw new HttpsError("failed-precondition", "Insufficient balance.");
  }

  const next: WalletDoc = {
    ...wallet,
    relationshipId: user.relationshipId,
    balance: wallet.balance - amount,
    lifetimeRedeemed: wallet.lifetimeRedeemed + amount,
    monthlyRedeemed: wallet.monthlyRedeemed + amount,
    updatedAt: serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(walletRef(uid), next, { merge: true });
  batch.create(
    transactionsRef().doc(),
    makeTransaction(next, {
      kind: "redeem",
      delta: -amount,
      amount,
      balanceAfter: wallet.balance - amount,
      reason,
      createdBy: actorUid,
      monthKey: next.currentMonthKey,
    })
  );
  batch.create(auditRef().doc(), makeAudit("wallet.redeem", actorUid, uid, { amount, reason }));
  await batch.commit();
}

export async function updateStreak(uid: string, actorUid: string, performedAt?: number) {
  const user = await getUserOrThrow(uid);
  const baseWallet = await getOrCreateWallet(user);
  const wallet = await ensureWalletCurrent(user, baseWallet, performedAt ? new Date(performedAt) : new Date());
  const today = dayKey(performedAt ? new Date(performedAt) : new Date());

  if (wallet.lastStreakDate === today) return;

  const continued = wallet.lastStreakDate === previousDayKey(today);
  const currentStreak = continued ? wallet.currentStreak + 1 : 1;
  const bestStreak = Math.max(wallet.bestStreak, currentStreak);
  const next: WalletDoc = {
    ...wallet,
    relationshipId: user.relationshipId,
    currentStreak,
    bestStreak,
    lastStreakDate: today,
    updatedAt: serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(walletRef(uid), next, { merge: true });
  batch.create(
    transactionsRef().doc(),
    makeTransaction(next, {
      kind: "streak",
      delta: 0,
      amount: currentStreak,
      balanceAfter: wallet.balance,
      reason: `Streak updated to ${currentStreak} day(s)`,
      createdBy: actorUid,
      monthKey: next.currentMonthKey,
      metadata: { bestStreak, dayKey: today },
    })
  );
  batch.create(auditRef().doc(), makeAudit("wallet.streak", actorUid, uid, { currentStreak, bestStreak }));
  await batch.commit();
}

export async function applyMonthlyDecayForAllWallets() {
  const users = await db.collection("users").get();
  for (const snap of users.docs) {
    const user = snap.data() as UserDoc;
    const wallet = await getOrCreateWallet(user);
    await ensureWalletCurrent(user, wallet, new Date());
  }
}
