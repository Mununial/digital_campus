import { AuthService, isUserAdmin } from '../services/authService.js';
import { Store } from '../store.js';
import { initPasswordToggle } from '../utils/passwordToggle.js';

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
    const form = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = document.getElementById('submit-btn');
    const googleBtn = document.getElementById('google-login-btn');
    const loadingOverlay = document.getElementById('auth-loading-overlay');

    function showLoading(msg = 'Logging in...') {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="btn-spinner"></span> ${msg}`;
        if (googleBtn) googleBtn.disabled = true;
        if (loadingOverlay) {
            const label = loadingOverlay.querySelector('div[style*="font-weight: 700"]');
            if (label) label.textContent = msg;
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoading() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Login';
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.innerHTML = `
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style="width: 18px; height: 18px;">
                Sign in with Google
            `;
        }
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        errorMsg.style.display = 'none';
        showLoading('Logging in...');
        
        try {
            const loginResult = await AuthService.login(email, password, rememberMe);
            const isAdmin = loginResult?.isAdmin ?? (loginResult?.user ? await isUserAdmin(loginResult.user) : await isUserAdmin(loginResult));
            if (isAdmin) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = '../index.html';
            }
        } catch (error) {
            hideLoading();
            errorMsg.textContent = 'Invalid email or password.';
            if (error.code === 'auth/user-not-found') {
                errorMsg.textContent = 'No user found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMsg.textContent = 'Incorrect password.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg.textContent = 'Too many attempts. Please try again later.';
            } else if (error.message) {
                errorMsg.textContent = error.message;
            }
            errorMsg.style.display = 'block';
        }
    });

    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            errorMsg.style.display = 'none';
            showLoading('Signing in with Google...');
            try {
                const loginResult = await AuthService.loginWithGoogle();
                const isAdmin = loginResult?.isAdmin ?? (loginResult?.user ? await isUserAdmin(loginResult.user) : await isUserAdmin(loginResult));
                if (isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = '../index.html';
                }
            } catch (error) {
                hideLoading();
                errorMsg.textContent = 'Google Sign-In failed: ' + (error.message || 'Please try again.');
                errorMsg.style.display = 'block';
            }
        });
    }
});
