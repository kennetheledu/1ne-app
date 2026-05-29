import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import type { AiTaskPoolDoc, StreakDoc, TaskCategory, TaskDifficulty, TaskDoc, UserDoc } from "./types";
import { assertSelfNonAdmin, awardPoints, updateStreak } from "./points";

const db = admin.firestore();
const CATEGORIES: TaskCategory[] = ["romantic", "fun", "emotional", "practical"];

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
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

function endOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return admin.firestore.Timestamp.fromDate(copy);
}

function aiPrompt(category: TaskCategory, today: string) {
  const intent = {
    romantic: "make affection feel specific and low pressure",
    fun: "create a playful micro-moment with no prep",
    emotional: "invite a safe two-way check-in",
    practical: "reduce one tiny friction point in the relationship",
  }[category];

  return `AI generated for ${today}: ${intent}. Keep it doable in under 10 minutes.`;
}

function titleFor(category: TaskCategory) {
  return {
    romantic: "Affection Spark",
    fun: "Playful Reset",
    emotional: "Gentle Check-In",
    practical: "Tiny Team Move",
  }[category];
}

function difficultyFor(category: TaskCategory): TaskDifficulty {
  return category === "emotional" ? "medium" : "easy";
}

export async function generateAiTaskPoolsForToday() {
  const today = dayKey();
  const batch = db.batch();

  for (const category of CATEGORIES) {
    const difficulty = difficultyFor(category);
    const pool: AiTaskPoolDoc = {
      category,
      title: titleFor(category),
      prompt: aiPrompt(category, today),
      difficulty,
      rewardValue: difficulty === "easy" ? 2 : 4,
      surpriseEligible: category !== "practical",
      active: true,
      generatedBy: "scheduled-ai",
      createdAt: serverTimestamp(),
    };
    batch.create(db.collection("aiTaskPools").doc(), pool);
  }

  batch.create(db.collection("auditLogs").doc(), {
    actor: "system",
    action: "task.pool.generate",
    target: today,
    meta: { categories: CATEGORIES },
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

async function getPoolsForCategory(category: TaskCategory, surprise = false) {
  let query = db.collection("aiTaskPools")
    .where("active", "==", true)
    .where("category", "==", category);

  if (surprise) query = query.where("surpriseEligible", "==", true);
  const snap = await query.limit(10).get();
  return snap.docs;
}

async function assignTasksForUser(user: UserDoc) {
  const today = dayKey();
  const existing = await db.collection("tasks")
    .where("ownerUid", "==", user.uid)
    .where("assignedForDay", "==", today)
    .limit(1)
    .get();

  if (!existing.empty) return;

  const surpriseIndex = Math.floor(Math.random() * CATEGORIES.length);
  const batch = db.batch();

  for (const [index, category] of CATEGORIES.entries()) {
    const isSurprise = index === surpriseIndex;
    let pools = await getPoolsForCategory(category, isSurprise);
    if (pools.length === 0) pools = await getPoolsForCategory(category, false);
    const poolSnap = pools[Math.floor(Math.random() * pools.length)];
    if (!poolSnap) continue;
    const pool = poolSnap.data() as AiTaskPoolDoc;

    const task: TaskDoc = {
      ownerUid: user.uid,
      relationshipId: user.relationshipId,
      category,
      title: pool.title,
      prompt: pool.prompt,
      difficulty: pool.difficulty,
      rewardValue: pool.rewardValue + (isSurprise ? 1 : 0),
      status: "pending",
      surprise: isSurprise,
      revealed: !isSurprise,
      assignedForDay: today,
      sourcePoolId: poolSnap.id,
      expiresAt: endOfDay(),
      completedAt: null,
      completedBy: null,
      createdAt: serverTimestamp(),
    };
    batch.create(db.collection("tasks").doc(), task);
  }

  batch.create(db.collection("notifications").doc(), {
    userId: user.uid,
    title: "Today's couple tasks are ready",
    body: "Four AI-generated tasks were assigned for today.",
    type: "task",
    read: false,
    createdAt: serverTimestamp(),
  });
  batch.create(db.collection("auditLogs").doc(), {
    actor: "system",
    action: "task.assign",
    target: user.uid,
    meta: { dayKey: today },
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function assignDailyTasksForAllUsers() {
  const pools = await db.collection("aiTaskPools").where("active", "==", true).limit(1).get();
  if (pools.empty) await generateAiTaskPoolsForToday();

  const users = await db.collection("users").get();
  for (const userSnap of users.docs) {
    await assignTasksForUser(userSnap.data() as UserDoc);
  }
}

export async function revealTask(uid: string, taskId: string, authUid: string | undefined) {
  if (!authUid || authUid !== uid) throw new HttpsError("permission-denied", "Not your task.");
  const ref = db.collection("tasks").doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Task not found.");
  const task = snap.data() as TaskDoc;
  if (task.ownerUid !== uid) throw new HttpsError("permission-denied", "Not your task.");
  await ref.update({ revealed: true });
}

async function getOrCreateStreak(user: UserDoc) {
  const ref = db.collection("streaks").doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as StreakDoc;
  const fresh: StreakDoc = {
    ownerUid: user.uid,
    relationshipId: user.relationshipId,
    current: 0,
    best: 0,
    lastCompletionDay: null,
    totalCompletions: 0,
    bonusPointsEarned: 0,
    history: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await ref.set(fresh);
  return fresh;
}

export async function completeTask(uid: string, taskId: string, authUid: string | undefined) {
  const user = await assertSelfNonAdmin(authUid, uid);
  const ref = db.collection("tasks").doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Task not found.");
  const task = snap.data() as TaskDoc;
  if (task.ownerUid !== uid) throw new HttpsError("permission-denied", "Not your task.");
  if (task.status === "completed") return;
  if (task.expiresAt.toMillis() <= Date.now()) {
    await ref.update({ status: "expired" });
    throw new HttpsError("failed-precondition", "Task expired.");
  }

  await awardPoints(uid, task.rewardValue, `Task completed: ${task.title}`, authUid!);
  await updateStreak(uid, authUid!);

  const streak = await getOrCreateStreak(user);
  const today = dayKey();
  const firstToday = streak.lastCompletionDay !== today;
  const continued = streak.lastCompletionDay === previousDayKey(today);
  const nextCurrent = firstToday ? (continued ? streak.current + 1 : 1) : streak.current;
  const bonus = firstToday && nextCurrent > 0 && nextCurrent % 3 === 0 ? 2 : 0;
  if (bonus > 0) await awardPoints(uid, bonus, `${nextCurrent}-day task streak bonus`, authUid!);

  const history = streak.history ?? [];
  const existing = history.find((entry) => entry.dayKey === today);
  const nextHistory = existing
    ? history.map((entry) => entry.dayKey === today
      ? { ...entry, completedTasks: entry.completedTasks + 1, streakCount: nextCurrent, bonusAwarded: entry.bonusAwarded + bonus }
      : entry)
    : [
      ...history,
      {
        dayKey: today,
        completedTasks: 1,
        streakCount: nextCurrent,
        bonusAwarded: bonus,
        createdAt: admin.firestore.Timestamp.now(),
      },
    ];

  await db.collection("streaks").doc(uid).set({
    ownerUid: uid,
    relationshipId: user.relationshipId,
    current: nextCurrent,
    best: Math.max(streak.best, nextCurrent),
    lastCompletionDay: today,
    totalCompletions: streak.totalCompletions + 1,
    bonusPointsEarned: streak.bonusPointsEarned + bonus,
    history: nextHistory.slice(-60),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await ref.update({
    status: "completed",
    revealed: true,
    completedAt: admin.firestore.Timestamp.now(),
    completedBy: uid,
  });
}

export async function expireOverdueTasks() {
  const snap = await db.collection("tasks")
    .where("status", "==", "pending")
    .where("expiresAt", "<=", admin.firestore.Timestamp.now())
    .get();

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: "expired" });
  }
  await batch.commit();
}