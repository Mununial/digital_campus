import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Safely resolve public Firebase web client credentials
const getClientApiKey = () => {
  return (
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyBpLQvYjddu0LaEUhPmva08u89eOXKbImg"
  );
};

// Live Firebase Project configuration for genzuniversity
const firebaseConfig = {
  apiKey: getClientApiKey(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "genzuniversity.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "genzuniversity",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "genzuniversity.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "423748552299",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:423748552299:web:8981f1300ad217afd7132e"
};

// Check if valid API Key is provided
export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("DemoConfigKey")
);

let app = null;
let auth = null;
let db = null;

if (isLiveFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Live Firebase & Cloud Firestore connected to project:", firebaseConfig.projectId);
  } catch (error) {
    console.warn("Firebase initialization warning:", error);
  }
}

export { app, auth, db };
