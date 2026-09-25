import { AuthService } from '../services/authService.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-form');
    const msgContainer = document.getElementById('msg-container');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        
        if (!email) return;

        msgContainer.style.display = 'none';
        msgContainer.className = '';
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending reset link...';
        
        try {
            await AuthService.resetPassword(email);
            
            msgContainer.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">✅ Password Reset Email Sent!</div>
                <div>We have sent a password reset link to <strong>${email}</strong>. Please check your Inbox and Spam folder.</div>
                <div style="margin-top: 8px; font-size: 0.8rem; color: #047857;">Redirecting to login in 5 seconds...</div>
            `;
            msgContainer.className = 'msg-success';
            msgContainer.style.display = 'block';
            
            submitBtn.textContent = 'Email Sent!';
            document.getElementById('email').value = '';

            let seconds = 5;
            const timer = setInterval(() => {
                seconds--;
                if (seconds > 0) {
                    const timerText = msgContainer.querySelector('div:last-child');
                    if (timerText) timerText.textContent = `Redirecting to login in ${seconds} seconds...`;
                } else {
                    clearInterval(timer);
                    window.location.href = 'login.html';
                }
            }, 1000);

        } catch (error) {
            console.error("Forgot password error:", error);
            let errorMessage = 'Failed to send reset email. Please try again.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
            }
            
            msgContainer.innerHTML = `<div>⚠️ ${errorMessage}</div>`;
            msgContainer.className = 'msg-error';
            msgContainer.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
    });
});
