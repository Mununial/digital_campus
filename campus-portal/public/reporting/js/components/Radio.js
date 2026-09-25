export function Radio({ id, name, label, value, required = false }) {
    return `
        <div class="radio-group" style="display: flex; align-items: center; margin-bottom: var(--space-2);">
            <input 
                type="radio" 
                id="${id}" 
                name="${name}" 
                value="${value}"
                class="form-radio"
                style="margin-right: var(--space-2); cursor: pointer;"
                ${required ? 'required' : ''}
            >
            <label for="${id}" style="cursor: pointer; margin-bottom: 0;">${label}</label>
        </div>
    `;
}
