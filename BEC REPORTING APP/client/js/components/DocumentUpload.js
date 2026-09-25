export function DocumentUpload({ id, label, required = false, isCustom = false, maxMB = 2 }) {
    const limitMB = 2;
    const formatText = '📁 Format: JPG, JPEG, PNG (Image Only)';
    const acceptAttr = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png';

    return `
        <div class="document-upload-row" id="doc-row-${id}" style="display: flex; flex-direction: column; padding: var(--space-3); border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                <div class="doc-info" style="flex: 1; min-width: 200px;">
                    <label style="font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 2px; color: var(--text-color);">
                        <span>${label}</span>
                        ${required ? '<span style="font-size: 0.75rem; background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px;">Required</span>' : '<span style="font-size: 0.75rem; background: #9CA3AF; color: white; padding: 2px 6px; border-radius: 4px;">Optional</span>'}
                        ${isCustom ? '<span style="font-size: 0.75rem; background: #3B82F6; color: white; padding: 2px 6px; border-radius: 4px;">Custom</span>' : ''}
                    </label>
                    <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <span>${formatText}</span>
                        <span>&bull;</span>
                        <span style="color: #2563eb; font-weight: 600;">Max Size: ${limitMB} MB</span>
                    </div>
                    <div class="doc-status" id="${id}-status" style="font-size: 0.85rem; color: var(--text-muted);">
                        Pending
                    </div>
                </div>
                
                <div class="doc-actions" style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
                    <input type="file" id="${id}-input" style="display: none;" accept="${acceptAttr}">
                    
                    <button type="button" class="btn btn-primary btn-sm doc-upload-btn" id="${id}-upload-btn" onclick="document.getElementById('${id}-input').click()" style="padding: var(--space-2) var(--space-3); font-size: 0.85rem;">
                        Upload
                    </button>
                    
                    <button type="button" class="btn btn-secondary btn-sm doc-preview-btn" id="${id}-preview-btn" style="display: none; padding: var(--space-2) var(--space-3); font-size: 0.85rem; background-color: var(--secondary-blue); color: white; border: none;">
                        Preview
                    </button>
                    
                    <button type="button" class="btn btn-secondary btn-sm doc-download-btn" id="${id}-download-btn" style="display: none; padding: var(--space-2) var(--space-3); font-size: 0.85rem; background-color: #10B981; color: white; border: none;">
                        Download
                    </button>
                    
                    <button type="button" class="btn btn-danger btn-sm doc-remove-btn" id="${id}-remove-btn" style="display: none; padding: var(--space-2) var(--space-3); font-size: 0.85rem; background-color: var(--danger); color: white; border: none;">
                        Remove
                    </button>

                    ${isCustom ? `
                    <button type="button" class="btn btn-outline btn-sm delete-custom-doc-btn" data-id="${id}" title="Delete this document row" style="padding: var(--space-2) var(--space-3); font-size: 0.85rem; color: #EF4444; border-color: #FCA5A5; background: #FEF2F2;">
                        🗑️ Delete
                    </button>
                    ` : ''}
                </div>
            </div>
            <!-- Validation Area -->
            <div class="validation-message" id="${id}-error" style="color: var(--danger); font-size: 0.8rem; margin-top: 4px; display: none;"></div>
        </div>
    `;
}
