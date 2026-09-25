import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const appConfigFirebase = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.firebase)
    ? window.APP_CONFIG.firebase
    : {};

const firebaseConfig = {
    apiKey: appConfigFirebase.apiKey || "AIzaSyBpLQvYjddu0LaEUhPmva08u89eOXKbImg",
    authDomain: appConfigFirebase.authDomain || "genzuniversity.firebaseapp.com",
    projectId: appConfigFirebase.projectId || "genzuniversity",
    storageBucket: appConfigFirebase.storageBucket || "genzuniversity.firebasestorage.app",
    messagingSenderId: appConfigFirebase.messagingSenderId || "423748552299",
    appId: appConfigFirebase.appId || "1:423748552299:web:8981f1300ad217afd7132e"
};

// Initialize Firebase with fast persistent local cache
const app = initializeApp(firebaseConfig);

let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    db = getFirestore(app);
}

const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth, firebaseConfig };
