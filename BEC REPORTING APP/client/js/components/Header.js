export function Header() {
    const name = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.institutionName) 
        ? window.APP_CONFIG.institutionName.toUpperCase() 
        : 'BHUBANESWAR ENGINEERING COLLEGE';
    return `
        <header class="gov-header" style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 12px 0;">
            <div class="container" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 14px; cursor: pointer;" onclick="window.location.href='/'" title="Return to Main Campus Portal">
                    <div class="gov-header-logo">
                        <img src="../assets/images/bec_logo.png" alt="Logo" onerror="this.src='./assets/images/bec_logo.png'" style="width: 44px; height: 44px; border-radius: 8px;">
                    </div>
                    <div class="gov-header-text" style="color: #ffffff;">
                        <h1 style="font-size: 1.1rem; font-weight: 800; margin: 0; color: #ffffff;">${name}</h1>
                        <p style="font-size: 0.78rem; margin: 0; color: #93c5fd;">Student Reporting & Verification Management System</p>
                    </div>
                </div>
                <div>
                    <a href="/" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 0.82rem; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: transform 0.15s ease;">
                        <span>🏠 Main Campus Portal</span>
                    </a>
                </div>
            </div>
        </header>
    `;
}
