export function Checkbox({ id, name, label, required = false }) {
    return `
        <div class="checkbox-group" style="display: flex; align-items: center; margin-bottom: var(--space-2);">
            <input 
                type="checkbox" 
                id="${id}" 
                name="${name || id}" 
                class="form-checkbox"
                style="margin-right: var(--space-2); cursor: pointer;"
                ${required ? 'required' : ''}
            >
            <label for="${id}" style="cursor: pointer; margin-bottom: 0;">
                ${label} ${required ? '<span class="required" style="color:var(--danger)">*</span>' : ''}
            </label>
            <div class="validation-message" id="${id}-error" style="color: var(--danger); font-size: 0.8rem; margin-left: var(--space-2); display: none;"></div>
        </div>
    `;
}
