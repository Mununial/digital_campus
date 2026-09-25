import { FirestoreService } from './firestoreService.js';
import { auth, db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const AuditService = {
    /**
     * Log an action to the Firestore audit_logs collection
     * @param {string} action - Describe the action (e.g., 'LOGIN', 'PDF_GENERATED', 'UPDATE_RECORD')
     * @param {Object} details - Additional JSON details about the action
     */
    async log(action, details = {}) {
        try {
            const user = auth.currentUser;
            if (!user) return; // Silent return if unauthenticated
            
            const auditEntry = {
                uid: user.uid,
                email: user.email,
                action: action,
                details: details,
                timestamp: new Date().toISOString()
            };
            
            await addDoc(collection(db, 'audit_logs'), auditEntry);
            console.log(`[Audit] ${action} logged.`);
        } catch (error) {
            console.error("Failed to write audit log:", error);
            // We intentionally do not throw here to prevent blocking main UI flows
        }
    }
};
