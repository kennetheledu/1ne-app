import { useEffect, useState } from "react";
import { getMe, type UserDoc } from "./firebaseCallables";

/** Hook that returns the current user's Firestore doc and refreshes on storage changes. */
export function useMe(): UserDoc | null {
  const [me, setMe] = useState<UserDoc | null>(null);

  function refresh() {
    getMe()
      .then(setMe)
      .catch((error) => {
        console.error("Failed to fetch user:", error);
        setMe(null);
      });
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("1ne:db-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("1ne:db-changed", onStorage);
    };
  }, []);

  return me;
}

export function emitDbChange() {
  window.dispatchEvent(new Event("1ne:db-changed"));
}
