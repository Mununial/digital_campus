export function Button({ text, id = '', className = 'btn-primary', onClick = '' }) {
    return `
        <button 
            type="button" 
            ${id ? `id="${id}"` : ''} 
            class="btn ${className}"
            ${onClick ? `onclick="${onClick}"` : ''}
        >
            ${text}
        </button>
    `;
}
