import { useEffect, useState } from "react";
import { getNotificationsFor, type NotificationDoc } from "./firebaseCallables";

export function useNotifications(uid?: string | null) {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);

  useEffect(() => {
    const refresh = async () => {
      if (!uid) {
        setNotifications([]);
        return;
      }
      try {
        const notifs = await getNotificationsFor(uid);
        setNotifications(notifs);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotifications([]);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("1ne:db-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("1ne:db-changed", refresh);
    };
  }, [uid]);

  return notifications;
}
