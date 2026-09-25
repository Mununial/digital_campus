export function Select({ id, label, options = [], required = false, name }) {
    const optionsHtml = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
    
    return `
        <div class="form-group">
            <label for="${id}" class="form-label">
                ${label} ${required ? '<span class="required">*</span>' : ''}
            </label>
            <select 
                id="${id}" 
                name="${name || id}" 
                class="form-control" 
                ${required ? 'required' : ''}
            >
                <option value="" disabled selected>Select an option</option>
                ${optionsHtml}
            </select>
            <div class="validation-message" id="${id}-error" style="color: var(--danger); font-size: 0.8rem; margin-top: 4px; display: none;"></div>
        </div>
    `;
}
