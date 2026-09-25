import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const appConfigFirebase = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.firebase)
    ? window.APP_CONFIG.firebase
    : {};

const firebaseConfig = {
    apiKey: appConfigFirebase.apiKey || "",
    authDomain: appConfigFirebase.authDomain || "",
    projectId: appConfigFirebase.projectId || "",
    storageBucket: appConfigFirebase.storageBucket || "",
    messagingSenderId: appConfigFirebase.messagingSenderId || "",
    appId: appConfigFirebase.appId || ""
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
