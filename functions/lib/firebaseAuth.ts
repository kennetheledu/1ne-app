import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as fbOnAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "./firebaseClient";

export const getAuthUser = () => auth.currentUser;

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return fbOnAuthStateChanged(auth, callback);
};

export const signInWithEmail = async (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  // Note: The 'getMe' logic or a firestore trigger usually creates the UserDoc
  return cred;
};

export const signOutUser = async () => {
  return signOut(auth);
};