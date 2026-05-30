/**
 * Firebase Auth SDK functions wrapper.
 * 
 * These are thin wrappers around the Firebase Web SDK Auth functions.
 * Not callables; direct SDK usage from frontend.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebaseClient";
import type { AuthUser } from "./firebaseTypes";
import { linkPartner } from "./firebaseCallables";

// ============================================================================
// AUTH HELPERS
// ============================================================================

function userToAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
  };
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export function getAuthUser(): AuthUser | null {
  const user = auth.currentUser;
  if (!user) console.debug("[Auth] getAuthUser: No active session found.");
  return user ? userToAuthUser(user) : null;
}

export function onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe {
  console.log("[Auth] Initializing Auth State Listener");
  return firebaseOnAuthStateChanged(auth, (user) => {
    console.log(`[Auth] State Change: ${user ? `User logged in (${user.uid})` : "No user session"}`);
    callback(user ? userToAuthUser(user) : null);
  });
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  try {
    console.log(`[Auth] Attempting login for ${email}...`);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log(`[Auth] Login successful for UID: ${cred.user.uid}`);
  } catch (error: any) {
    console.error(`[Auth] Login Failed: [${error.code}] ${error.message}`);
    throw error;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  inviteCodeToJoin?: string,
): Promise<void> {
  try {
    console.log(`[Auth] Attempting sign-up for ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
      // 1. Update the Auth Profile
      await updateProfile(user, { displayName });

      // 2. Generate a random 6-char uppercase string for the user's invite code
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const inviteCode = Array.from({ length: 6 }, () => 
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
      
      // Auto-assign admin role if email matches the corporate domain
      let role: AuthUser["role"] = inviteCodeToJoin ? "partner" : "member";
      if (email.toLowerCase().endsWith("@1ne.app")) {
        role = "admin";
      }

      // 3. Create User Document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role,
        inviteCode,
        coupleId: null,
        partnerId: null,
        displayName: displayName || "",
        nickname: "",
        partnerNickname: "",
        currentStreak: 0,
        longestStreak: 0,
        lastStreakDate: "",
        createdAt: serverTimestamp(),
      });

      // 4. Create Wallet Document
      await setDoc(doc(db, "wallets", user.uid), {
        uid: user.uid,
        totalPoints: 0,
        monthlyRedeemed: 0,
        lastDecayMonth: "",
      });

      // 5. Create Streak Document
      await setDoc(doc(db, "streaks", user.uid), {
        uid: user.uid,
        currentStreak: 0,
        longestStreak: 0,
        lastStreakDate: "",
      });

      // 6. Link partner if joining via an existing invite code
      if (inviteCodeToJoin) {
        await linkPartner(user.uid, inviteCodeToJoin);
      }

      console.log(`[Auth] Sign-up and all Firestore docs created for UID: ${user.uid}`);
    }
  } catch (error: any) {
    console.error(`[Auth] Sign-up Failed: [${error.code}] ${error.message}`);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
