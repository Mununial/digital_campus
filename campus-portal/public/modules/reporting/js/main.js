import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Button } from './components/Button.js';
import { AuthService, isUserAdmin } from './services/authService.js';
import { SessionService } from './services/sessionService.js';
import { Store } from './store.js';
import { Sanitizer } from './utils/sanitizer.js';
import { initPasswordToggle } from './utils/passwordToggle.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Automatic Cache Invalidation Check for High Traffic Zero-Stale Cache
    const APP_VERSION = '1.0.5';
    if (localStorage.getItem('bec_srms_version') !== APP_VERSION) {
        localStorage.setItem('bec_srms_version', APP_VERSION);
    }

    initPasswordToggle();
    // Inject Layout Components
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = Header();
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) footerContainer.innerHTML = Footer();

    // Check Authentication
    const user = await AuthService.waitForAuth();
    const rawPath = window.location.pathname.toLowerCase();
    const isAuthPage = rawPath.includes('login') || rawPath.includes('register') || rawPath.includes('forgot-password');
    const isSubmissionPage = rawPath.includes('submission');
    const isPreviewPage = rawPath.includes('preview');
    const isAdminPage = rawPath.includes('admin');
    
    if (!user && !isAuthPage) {
        // Redirect to login if not authenticated
        window.location.href = rawPath.includes('/pages/') ? 'login.html' : 'pages/login.html';
        return;
    }

    if (user) {
        // Check if Sub-Admin user has been blocked by Super Admin
        if (window.FirestoreService) {
            const isBlocked = await window.FirestoreService.isSubAdminBlocked(user.uid, user.email);
            if (isBlocked) {
                alert("❌ Your Sub-Admin account has been BLOCKED by Super Admin. Access Denied!");
                if (window.AuthService && window.AuthService.logout) {
                    await window.AuthService.logout();
                }
                window.location.href = rawPath.includes('/pages/') ? 'login.html' : 'pages/login.html';
                return;
            }
        }
        // Initialize 2-hour inactivity session monitoring for logged in users
        SessionService.init();
    }
    
    const isAdmin = await isUserAdmin(user);

    if (user && !isAdmin) {
        // Real-time synchronization of student reporting application to Firestore
        Store.data.id = user.uid;
        if (!Store.data.admin) Store.data.admin = {};
        Store.data.admin.uid = user.uid;
        Store.data.role = 'student';
        if (user.email && !Store.data.personal?.studentEmail) {
            Store.data.personal = Store.data.personal || {};
            Store.data.personal.studentEmail = user.email;
        }
        if (user.displayName && !Store.data.personal?.studentFullName) {
            Store.data.personal.studentFullName = user.displayName;
        }
        if (window.SyncService) {
            window.SyncService.syncNow();
        }
    }
    
    // Auth Page Redirects
    if (user && isAuthPage) {
        if (isAdmin) {
            window.location.href = rawPath.includes('/pages/') ? 'admin.html' : 'pages/admin.html';
        } else {
            window.location.href = rawPath.includes('/pages/') ? '../index.html' : 'index.html';
        }
        return;
    }

    // Strictly enforce Admin view for Admin accounts (Admin MUST NOT see student reporting)
    if (user && isAdmin && !isAdminPage) {
        window.location.href = rawPath.includes('/pages/') ? 'admin.html' : 'pages/admin.html';
        return;
    }

    // Strictly block Non-Admin (Student) accounts from accessing Admin page
    if (user && !isAdmin && isAdminPage) {
        alert('Access Denied: Only authorized administrators can access the Admin Panel.');
        window.location.href = rawPath.includes('/pages/') ? '../index.html' : 'index.html';
        return;
    }

    // Inject Profile Widget if logged in
    if (user && headerContainer) {
        const headerInner = headerContainer.querySelector('.container');
        if (headerInner && !document.getElementById('user-header-profile-widget')) {
            const profileDiv = document.createElement('div');
            profileDiv.id = 'user-header-profile-widget';
            profileDiv.style.cssText = 'display:flex; align-items:center; gap:12px; margin-left:auto;';
            const roleBadge = isAdmin 
                ? '<span style="background:#22c55e; color:white; font-size:0.7rem; padding:2px 8px; border-radius:12px; font-weight:700; text-transform:uppercase;">Administrator</span>'
                : '<span style="background:var(--primary-blue); color:white; font-size:0.7rem; padding:2px 8px; border-radius:12px; font-weight:700; text-transform:uppercase;">Student</span>';

            profileDiv.innerHTML = `
                <div style="text-align: right; font-size: 0.85rem;">
                    <strong style="color: #0f172a; display: block;">${Sanitizer.sanitizeString(Store.data.personal?.studentFullName || user.displayName || user.email)}</strong>
                    ${roleBadge}
                </div>
                <button id="logout-btn" class="btn btn-secondary" style="padding: 5px 12px; font-size: 0.82rem; border-radius: 6px; cursor: pointer; font-weight: 600; background: #e2e8f0; color: #0f172a; border: none;">Logout</button>
            `;
            headerInner.appendChild(profileDiv);
            
            document.getElementById('logout-btn').addEventListener('click', () => {
                AuthService.logout();
            });
        }
    }

    // Inject "Start / Continue Reporting" Button on Home Page
    const actionContainer = document.getElementById('action-container');
    if (actionContainer) {
        actionContainer.innerHTML = Button({
            text: 'Start / Continue Reporting',
            id: 'start-btn'
        });

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                // If user is Admin or Staff, redirect them to admin panel instead
                if (Store.data.role === 'admin' || Store.data.role === 'staff') {
                    window.location.href = 'pages/admin.html';
                    return;
                }
                
                const isFormSubmitted = !!(Store.data && (
                    Store.data.submission?.isSubmitted || 
                    ['COMPLETED', 'SUBMITTED', 'PENDING', 'VERIFIED', 'APPROVED'].includes(Store.data.admin?.status)
                ));

                if (isFormSubmitted && Store.data.admin?.status !== 'REVERTED') {
                    window.location.href = 'pages/submission.html';
                } else {
                    window.location.href = 'pages/dashboard.html';
                }
            });
        }
    }

    // Lock & Routing check for form pages
    const isFormSubmitted = !!(Store.data && (
        Store.data.submission?.isSubmitted || 
        ['COMPLETED', 'SUBMITTED', 'PENDING', 'VERIFIED', 'APPROVED'].includes(Store.data.admin?.status)
    ));

    if (rawPath.includes('/pages/') && 
        !isSubmissionPage &&
        !isPreviewPage &&
        !isAdminPage &&
        !isAuthPage &&
        isFormSubmitted && Store.data.admin?.status !== 'REVERTED') {
        
        window.location.href = 'submission.html';
    }

    // Initialize Auto-advance focus for required form fields
    setupAutoAdvanceFields();
});

// Auto-save local data on page refresh or browser unload
window.addEventListener('beforeunload', () => {
    if (Store) {
        Store.saveLocally();
    }
});

/**
 * Automatically advances focus to the next empty required field when pressing Enter or selecting dropdown options.
 */
export function setupAutoAdvanceFields(container = document) {
    const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'));
    
    inputs.forEach((input, index) => {
        // Visual focus ring for clear identification
        input.addEventListener('focus', () => {
            input.style.outline = '2px solid #2563eb';
            input.style.outlineOffset = '1px';
        });
        input.addEventListener('blur', () => {
            input.style.outline = 'none';
        });

        // Listen for Enter key press to move to next required field
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.tagName !== 'TEXTAREA') {
                e.preventDefault();
                const remainingRequired = inputs.slice(index + 1).find(el => el.hasAttribute('required') && !el.value.trim());
                if (remainingRequired) {
                    remainingRequired.focus();
                    remainingRequired.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (inputs[index + 1]) {
                    inputs[index + 1].focus();
                    inputs[index + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });

        // Auto-advance select dropdowns when option chosen
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                if (input.value) {
                    const remainingRequired = inputs.slice(index + 1).find(el => el.hasAttribute('required') && !el.value.trim());
                    if (remainingRequired) {
                        setTimeout(() => {
                            remainingRequired.focus();
                            remainingRequired.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }
                }
            });
        }
    });
}

