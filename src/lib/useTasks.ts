import { useEffect, useState } from "react";
import {
  getActiveTasks,
  getMyAchievements,
  getPendingApprovals,
  getStreakData,
  getTasksForUser,
  type AchievementDoc,
  type StreakDoc,
  type TaskDoc,
  type TaskSubmissionDoc,
} from "./firebaseCallables";

function useDb<T>(loader: () => Promise<T>, fallback: T, deps: unknown[] = []) {
  const [s, set] = useState<T>(fallback);
  useEffect(() => {
    const r = async () => {
      try {
        const result = await loader();
        set(result);
      } catch (error) {
        console.error("Task data load failed", error);
        set(fallback);
      }
    };
    r();
    window.addEventListener("1ne:db-changed", r);
    window.addEventListener("storage", r);
    return () => {
      window.removeEventListener("1ne:db-changed", r);
      window.removeEventListener("storage", r);
    };
  }, deps);
  return s;
}

export function useAllTasks(uid?: string | null) {
  return useDb<TaskDoc[]>(() => uid ? getTasksForUser(uid) : Promise.resolve([]), [], [uid]);
}
export function useActiveTasks(uid?: string | null) {
  return useDb<TaskDoc[]>(() => uid ? getActiveTasks(uid) : Promise.resolve([]), [], [uid]);
}
export function usePendingApprovals(uid?: string | null) {
  return useDb<TaskSubmissionDoc[]>(() => uid ? getPendingApprovals(uid) : Promise.resolve([]), [], [uid]);
}
export function useStreak(uid?: string | null) {
  return useDb<StreakDoc | null>(() => uid ? getStreakData(uid) : Promise.resolve(null), null, [uid]);
}
export function useMyAchievements(uid?: string | null) {
  return useDb<AchievementDoc[]>(() => uid ? getMyAchievements(uid) : Promise.resolve([]), [], [uid]);
}
