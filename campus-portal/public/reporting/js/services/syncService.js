import { Store } from '../store.js';
import { FirestoreService } from './firestoreService.js';
import { AuthService } from './authService.js';

export const SyncService = {
    isOnline: navigator.onLine,
    syncInProgress: false,
    
    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network online. Triggering sync...');
            this.syncNow();
            this.updateUiIndicator('Online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network offline. Saving locally...');
            this.updateUiIndicator('Offline');
        });

        // Initialize sync listener based on auth state
        AuthService.onAuthStateChanged((user) => {
            if (user && this.isOnline) {
                this.syncNow();
            }
        });
    },

    updateUiIndicator(status) {
        // Optional: Update a tiny indicator in the header if it exists
        const indicator = document.getElementById('sync-indicator');
        if (indicator) {
            indicator.textContent = status;
            indicator.style.color = status === 'Offline' ? 'red' : 'green';
        }
    },

    /**
     * Synchronize local data to Firestore with exponential backoff
     */
    async syncNow(retryCount = 0) {
        if (!this.isOnline || this.syncInProgress) return;
        
        let currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            currentUser = await AuthService.waitForAuth();
        }
        
        const studentId = currentUser ? currentUser.uid : (Store.data.id || Store.data.uid || Store.data.admin?.uid);
        if (!studentId) return;

        this.syncInProgress = true;
        this.updateUiIndicator(retryCount > 0 ? `Retrying... (${retryCount})` : 'Saving...');

        try {
            // Check remote Firestore doc first to avoid overwriting Admin revert or status updates
            const remoteDoc = await FirestoreService.getStudent(studentId);
            if (remoteDoc) {
                // If admin status is REVERTED, update admin section
                if (remoteDoc.admin && remoteDoc.admin.status === 'REVERTED') {
                    if (!Store.data.admin) Store.data.admin = {};
                    Store.data.admin.status = 'REVERTED';
                    Store.data.admin.revertReason = remoteDoc.admin.revertReason || '';
                }
                
                // Safely merge remote data into local Store without wiping filled local inputs
                for (const section in remoteDoc) {
                    if (typeof remoteDoc[section] === 'object' && remoteDoc[section] !== null) {
                        if (!Store.data[section]) Store.data[section] = {};
                        for (const key in remoteDoc[section]) {
                            const remoteVal = remoteDoc[section][key];
                            const localVal = Store.data[section][key];
                            if ((localVal === undefined || localVal === '' || localVal === null) && (remoteVal !== undefined && remoteVal !== '' && remoteVal !== null)) {
                                Store.data[section][key] = remoteVal;
                            }
                        }
                    }
                }
            }

            Store.data.id = studentId;
            if (!Store.data.admin) Store.data.admin = {};
            Store.data.admin.uid = studentId;
            if (currentUser && currentUser.email) {
                Store.data.personal = Store.data.personal || {};
                if (!Store.data.personal.studentEmail) {
                    Store.data.personal.studentEmail = currentUser.email;
                }
            }

            // Push current local state to Firestore
            await FirestoreService.saveStudent(studentId, Store.data);
            this.updateUiIndicator('Synced');
            Store.markSynced();
        } catch (error) {
            console.error(`Sync failed (attempt ${retryCount + 1}):`, error);
            this.updateUiIndicator('Error');
            
            if (retryCount < 5) {
                const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                setTimeout(() => {
                    this.syncInProgress = false;
                    this.syncNow(retryCount + 1);
                }, delay);
                return;
            }
        } finally {
            this.syncInProgress = false;
        }
    }
};

// Initialize listeners when DOM is ready to avoid circular dependency execution order issues
document.addEventListener('DOMContentLoaded', () => {
    SyncService.init();
});
