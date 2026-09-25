export function Card({ title, content, className = '' }) {
    return `
        <div class="card ${className}">
            ${title ? `<h3>${title}</h3>` : ''}
            <div class="card-content">
                ${content}
            </div>
        </div>
    `;
}
