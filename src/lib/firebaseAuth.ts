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
import { auth } from "./firebaseClient";
import type { AuthUser } from "./firebaseTypes";

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
): Promise<void> {
  try {
    console.log(`[Auth] Attempting sign-up for ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      console.log(`[Auth] Sign-up and profile update successful for UID: ${userCredential.user.uid}`);
    }
  } catch (error: any) {
    console.error(`[Auth] Sign-up Failed: [${error.code}] ${error.message}`);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
