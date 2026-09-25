export function Footer() {
    const currentYear = new Date().getFullYear();
    const name = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.institutionName) 
        ? window.APP_CONFIG.institutionName 
        : 'GenZ University';
    return `
        <footer class="gov-footer">
            <div class="container gov-footer-container">
                <div class="gov-footer-left">
                    &copy; ${currentYear} ${name}. All rights reserved.
                </div>
                <div class="gov-footer-right">
                    <span>Designed & Developed by</span>
                    <a href="https://www.ayushtechnologies.in/" target="_blank" rel="noopener noreferrer" class="developer-badge" title="Ayush Technologies - Web & Software Solutions">
                        <span class="sparkle-icon">✨</span>
                        <span>Ayush Technologies</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ext-link-icon"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                </div>
            </div>
        </footer>
    `;
}
