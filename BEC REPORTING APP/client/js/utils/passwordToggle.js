export function initPasswordToggle() {
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-password-btn');
        if (!toggleBtn) return;
        
        const targetId = toggleBtn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        const eyeOff = toggleBtn.querySelector('.eye-icon-off');
        const eyeOn = toggleBtn.querySelector('.eye-icon-on');
        if (eyeOff && eyeOn) {
            eyeOff.style.display = isPassword ? 'none' : 'block';
            eyeOn.style.display = isPassword ? 'block' : 'none';
        }
    });
}
