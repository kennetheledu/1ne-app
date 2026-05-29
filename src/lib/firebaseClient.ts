import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, type Messaging, isSupported } from "firebase/messaging";

const required = (name: string, value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    console.error(`[FirebaseConfig] Critical Error: Environment variable "${name}" is missing or empty.`);
    throw new Error(`Missing required Vite env var: ${name}`);
  }
  console.log(`[FirebaseConfig] Successfully loaded: ${name}`);
  return value;
};

const firebaseConfig = {
  apiKey: required("import.meta.env.VITE_FIREBASE_API_KEY", import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: required("import.meta.env.VITE_FIREBASE_AUTH_DOMAIN", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: required("import.meta.env.VITE_FIREBASE_PROJECT_ID", import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: required("import.meta.env.VITE_FIREBASE_STORAGE_BUCKET", import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: required(
    "import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID",
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: required("import.meta.env.VITE_FIREBASE_APP_ID", import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log("[Firebase] Initializing application for project:", firebaseConfig.projectId);

// Ensure ONLY ONE app instance across HMR/reloads.
const app: FirebaseApp = getApps().length
  ? (getApps()[0] as FirebaseApp)
  : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
console.log("[Firebase] Auth SDK initialized");

const db: Firestore = getFirestore(app);
console.log("[Firebase] Firestore SDK initialized");

// Messaging requires browser environment + VAPID key usage in the rest of the app.
// We still create the Messaging instance here for consistency.
// Wrap in isSupported check to prevent crashes in dev environments or unsupported browsers.
let messaging: Messaging | any = null;
isSupported().then(supported => {
  if (supported) {
    messaging = getMessaging(app);
    console.log("[Firebase] Messaging SDK initialized");
  }
}).catch(err => console.warn("[Firebase] Messaging support check skipped:", err.message));

export { app, auth, db, messaging };
