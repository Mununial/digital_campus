export function Header() {
    const name = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.institutionName) 
        ? window.APP_CONFIG.institutionName.toUpperCase() 
        : 'GENZ UNIVERSITY';
    return `
        <header class="gov-header">
            <div class="container">
                <div class="gov-header-logo">
                    <img src="../assets/images/bec_logo.png" alt="Logo" onerror="this.src='./assets/images/bec_logo.png'">
                </div>
                <div class="gov-header-text">
                    <h1>${name}</h1>
                    <p>Student Reporting Management System</p>
                </div>
            </div>
        </header>
    `;
}
