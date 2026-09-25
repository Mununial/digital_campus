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
        const token = localStorage.getItem('college_erp_token');
        if (!token) {
            notifyAuthSubscribers(null);
            return null;
        }

        try {
            const res = await fetch(`${getApiBase()}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                localStorage.setItem('college_erp_user', JSON.stringify(user));
                notifyAuthSubscribers(user);
                return user;
            }
        } catch (e) {}

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
            throw new Error(data.error || 'Failed to login');
        }

        localStorage.setItem('college_erp_token', data.token);
        localStorage.setItem('college_erp_user', JSON.stringify(data.user));
        
        Store.clear();
        Store.data.id = data.user.id;
        Store.data.email = data.user.email;
        Store.data.role = data.user.role;
        Store.data.userRole = data.user.role;
        Store.data.isAdmin = data.user.isAdmin;
        Store.saveLocally();

        notifyAuthSubscribers(data.user);
        return { user: data.user, isAdmin: data.user.isAdmin };
    },

    async register(email, password, fullName) {
        const res = await fetch(`${getApiBase()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to register account');
        }

        localStorage.setItem('college_erp_token', data.token);
        localStorage.setItem('college_erp_user', JSON.stringify(data.user));

        Store.clear();
        Store.data.id = data.user.id;
        Store.data.email = data.user.email;
        Store.data.role = data.user.role;
        Store.data.userRole = data.user.role;
        Store.data.isAdmin = data.user.isAdmin;
        Store.saveLocally();

        notifyAuthSubscribers(data.user);
        return { user: data.user, isAdmin: data.user.isAdmin };
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
    return user.isAdmin === true || user.role === 'admin' || user.userRole === 'admin';
}
