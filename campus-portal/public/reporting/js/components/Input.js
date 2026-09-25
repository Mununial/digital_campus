export function Input({ id, label, type = 'text', placeholder = '', required = false, name, disabled = false }) {
    const isPassword = type === 'password';
    return `
        <div class="form-group">
            <label for="${id}" class="form-label">
                ${label} ${required ? '<span class="required">*</span>' : ''}
            </label>
            <div style="${isPassword ? 'position: relative;' : ''}">
                <input 
                    type="${type}" 
                    id="${id}" 
                    name="${name || id}" 
                    class="form-control" 
                    placeholder="${placeholder}" 
                    ${required ? 'required' : ''}
                    ${disabled ? 'disabled' : ''}
                    ${isPassword ? 'style="padding-right: 42px;"' : ''}
                >
                ${isPassword ? `
                <button type="button" class="toggle-password-btn" data-target="${id}" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; align-items: center; justify-content: center;" aria-label="Toggle password visibility">
                    <svg class="eye-icon-off" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg class="eye-icon-on" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1 -4.24 -4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                </button>` : ''}
            </div>
            <!-- Validation Area (placeholder for future error messages) -->
            <div class="validation-message" id="${id}-error" style="color: var(--danger); font-size: 0.8rem; margin-top: 4px; display: none;"></div>
        </div>
    `;
}
