import { AuthService, isUserAdmin } from '../services/authService.js';
import { initPasswordToggle } from '../utils/passwordToggle.js';

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
    const form = document.getElementById('register-form');
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        errorMsg.style.display = 'none';
        
        if (password !== confirmPassword) {
            errorMsg.textContent = 'Passwords do not match.';
            errorMsg.style.display = 'block';
            return;
        }
        
        if (password.length < 6) {
            errorMsg.textContent = 'Password must be at least 6 characters.';
            errorMsg.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        
        try {
            const user = await AuthService.register(email, password, fullname);
            const isAdmin = await isUserAdmin(user);
            if (isAdmin) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = '../index.html';
            }
        } catch (error) {
            errorMsg.textContent = 'Registration failed.';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg.textContent = 'This email is already registered. Please login.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg.textContent = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMsg.textContent = 'Password is too weak.';
            } else {
                errorMsg.textContent = error.message;
            }
            errorMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
    });

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            errorMsg.style.display = 'none';
            try {
                const user = await AuthService.loginWithGoogle();
                const isAdmin = await isUserAdmin(user);
                if (isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = '../index.html';
                }
            } catch (error) {
                errorMsg.textContent = 'Google Sign-Up failed.';
                errorMsg.style.display = 'block';
            }
        });
    }
});
