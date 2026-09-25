/**
 * SessionService - Handles 2-Hour Inactivity Session Management
 * Keeps active users logged in continuously while working.
 * Logs out inactive sessions after 2 hours and prompts for Auto Re-login.
 */

import { AuthService } from './authService.js';

const LAST_ACTIVITY_KEY = 'bec_srms_last_activity';
const TIMEOUT_2_HOURS_MS = 2 * 60 * 60 * 1000; // 2 Hours in milliseconds (7,200,000 ms)
const CHECK_INTERVAL_MS = 15000; // Check every 15 seconds

let activityThrottleTimer = null;
let sessionCheckInterval = null;

export const SessionService = {
    init() {
        // Record initial activity time for this active tab session
        this.recordActivity();

        // Attach global user interaction listeners to keep session alive during active use
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(evt => {
            window.addEventListener(evt, () => this.handleUserActivity(), { passive: true });
        });

        // Start periodic session check
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);
        sessionCheckInterval = setInterval(() => this.checkInactivity(), CHECK_INTERVAL_MS);
    },

    recordActivity() {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    },

    resetSession() {
        this.recordActivity();
        const overlay = document.getElementById('session-expired-overlay');
        if (overlay) overlay.remove();
    },

    handleUserActivity() {
        // Throttle updates to localStorage to once every 10 seconds to optimize performance
        if (!activityThrottleTimer) {
            this.recordActivity();
            activityThrottleTimer = setTimeout(() => {
                activityThrottleTimer = null;
            }, 10000);
        }
    },

    checkInactivity() {
        // Only trigger session expiration if the user is currently authenticated
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            return;
        }

        const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivityStr) {
            this.recordActivity();
            return;
        }

        const lastActivity = parseInt(lastActivityStr, 10);
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastActivity;

        // If user has been inactive for >= 2 hours continuously in an open tab
        if (elapsedTime >= TIMEOUT_2_HOURS_MS) {
            this.handleSessionExpired();
        }
    },

    handleSessionExpired() {
        // Ensure user is actually logged in before showing session expired modal
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            return;
        }

        if (sessionCheckInterval) clearInterval(sessionCheckInterval);

        // Check if modal already exists
        if (document.getElementById('session-expired-overlay')) return;

        // Create overlay modal
        const overlay = document.createElement('div');
        overlay.id = 'session-expired-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            backdrop-filter: blur(4px);
        `;

        overlay.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 25px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                <div style="width: 50px; height: 50px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <h3 style="margin: 0 0 10px; color: #0f172a; font-size: 1.25rem;">Session Expired (2 Hours Inactive)</h3>
                <p style="margin: 0 0 20px; color: #64748b; font-size: 0.9rem; line-height: 1.5;">
                    You have been inactive for over 2 hours. For security, your session has ended. Please log in again to continue working.
                </p>
                <button id="relogin-btn" style="width: 100%; padding: 10px 16px; background: #1e40af; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; cursor: pointer;">
                    Re-Login Now
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('relogin-btn').addEventListener('click', async () => {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            await AuthService.logout();
        });
    }
};
