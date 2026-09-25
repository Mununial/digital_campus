import { Store } from '../store.js';

let currentUser = null;
const authSubscribers = [];

function notifyAuthSubscribers(user) {
    currentUser = user;
    authSubscribers.forEach(cb => {
        try { cb(user); } catch (e) {}
    });
}

const getApiBase = () => {
    if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) {
        return window.APP_CONFIG.apiBaseUrl;
    }
    return '';
};

export const AuthService = {
    onAuthStateChanged(callback) {
        authSubscribers.push(callback);
        const storedUser = this.getCurrentUser();
        if (storedUser) callback(storedUser);
        return () => {
            const idx = authSubscribers.indexOf(callback);
            if (idx !== -1) authSubscribers.splice(idx, 1);
        };
    },

    getCurrentUser() {
        if (currentUser) return currentUser;
        const storedUser = localStorage.getItem('college_erp_user');
        if (storedUser) {
            try {
                currentUser = JSON.parse(storedUser);
                return currentUser;
            } catch (e) {}
        }
        return null;
    },

    async waitForAuth() {
        const token = localStorage.getItem('college_erp_token') || localStorage.getItem('portalToken') || localStorage.getItem('authToken');
        if (!token) {
            notifyAuthSubscribers(null);
            return null;
        }

        try {
            const res = await fetch(`${getApiBase()}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const user = data.user || data;
                localStorage.setItem('college_erp_user', JSON.stringify(user));
                notifyAuthSubscribers(user);
                return user;
            }
        } catch (e) {}

        const cachedUser = this.getCurrentUser() || (() => {
            try { return JSON.parse(localStorage.getItem('bec_portal_user')); } catch (e) { return null; }
        })();

        if (cachedUser) {
            notifyAuthSubscribers(cachedUser);
            return cachedUser;
        }

        localStorage.removeItem('college_erp_token');
        localStorage.removeItem('college_erp_user');
        notifyAuthSubscribers(null);
        return null;
    },

    async login(email, password) {
        const res = await fetch(`${getApiBase()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.message || 'Failed to login');
        }

        const user = data.user || data;
        const authToken = data.token || data.tokens?.gateway || data.tokens?.reporting || data.tokens?.hostel;

        localStorage.setItem('college_erp_token', authToken);
        localStorage.setItem('college_erp_user', JSON.stringify(user));
        
        Store.clear();
        Store.data.id = user.id;
        Store.data.email = user.email;
        Store.data.role = user.role;
        Store.data.userRole = user.role;
        Store.data.isAdmin = user.isAdmin || String(user.role).toUpperCase().includes('ADMIN');
        Store.saveLocally();

        notifyAuthSubscribers(user);
        return { user, isAdmin: Store.data.isAdmin };
    },

    async register(email, password, fullName) {
        const res = await fetch(`${getApiBase()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.message || 'Failed to register account');
        }

        const user = data.user || data;
        const authToken = data.token || data.tokens?.gateway || data.tokens?.reporting || data.tokens?.hostel;

        localStorage.setItem('college_erp_token', authToken);
        localStorage.setItem('college_erp_user', JSON.stringify(user));

        Store.clear();
        Store.data.id = user.id;
        Store.data.email = user.email;
        Store.data.role = user.role;
        Store.data.userRole = user.role;
        Store.data.isAdmin = user.isAdmin || String(user.role).toUpperCase().includes('ADMIN');
        Store.saveLocally();

        notifyAuthSubscribers(user);
        return { user, isAdmin: Store.data.isAdmin };
    },

    async logout() {
        localStorage.removeItem('college_erp_token');
        localStorage.removeItem('college_erp_user');
        Store.clear();
        notifyAuthSubscribers(null);
    }
};

export async function isUserAdmin(user) {
    if (!user) return false;
    const r = String(user.role || user.userRole || '').toUpperCase();
    return user.isAdmin === true || r.includes('ADMIN');
}

export const OFFICIAL_ADMIN_EMAILS = [
    'superadmin@bec.ac.in',
    'admin@bec.ac.in',
    'ayush@bec.ac.in'
];

export async function createAdminAccount(email, password, fullName) {
    return AuthService.register(email, password, fullName);
}
