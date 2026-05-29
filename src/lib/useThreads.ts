import { useEffect, useState } from "react";
import { getThreadMessages, getThreads, type MessageDoc, type ThreadDoc } from "./firebaseCallables";

export function useThreadMessages(threadId?: string | null) {
  const [msgs, setMsgs] = useState<MessageDoc[]>([]);
  useEffect(() => {
    const r = async () => {
      if (!threadId) {
        setMsgs([]);
        return;
      }
      try {
        const messages = await getThreadMessages(threadId);
        setMsgs(messages);
      } catch (error) {
        console.error("Failed to fetch thread messages:", error);
        setMsgs([]);
      }
    };
    r();
    window.addEventListener("1ne:db-changed", r);
    return () => window.removeEventListener("1ne:db-changed", r);
  }, [threadId]);
  return msgs;
}

export function useThreads(uid?: string | null) {
  const [threads, setThreads] = useState<ThreadDoc[]>([]);
  useEffect(() => {
    const r = async () => {
      if (!uid) {
        setThreads([]);
        return;
      }
      try {
        const t = await getThreads(uid);
        setThreads(t);
      } catch (error) {
        console.error("Failed to fetch threads:", error);
        setThreads([]);
      }
    };
    r();
    window.addEventListener("1ne:db-changed", r);
    window.addEventListener("storage", r);
    return () => {
      window.removeEventListener("1ne:db-changed", r);
      window.removeEventListener("storage", r);
    };
  }, [uid]);
  return threads;
}
