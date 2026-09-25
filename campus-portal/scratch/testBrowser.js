const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('--- STARTING REAL CHROME TEST ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.toString() });
  });

  console.log('1. Navigating to http://localhost:5002...');
  await page.goto('http://localhost:5002', { waitUntil: 'networkidle2' });

  console.log('2. Entering credentials for BEC26002...');
  await page.type('#login-identifier', 'BEC26002');
  await page.type('#login-password', '2004-06-18');

  console.log('3. Clicking Sign In Once...');
  await page.click('#login-submit-btn');

  // Wait for dashboard view to become visible
  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 10000 });

  console.log('4. Checking doorway dashboard user...');
  const userName = await page.$eval('#dash-user-name', el => el.textContent);
  console.log('User displayed:', userName);

  // Check LocalStorage after doorway login
  const lsAfterLogin = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const obj = {};
    keys.forEach(k => obj[k] = localStorage.getItem(k));
    return obj;
  });
  console.log('\n--- LOCALSTORAGE AFTER DOORWAY LOGIN ---');
  console.log(JSON.stringify(lsAfterLogin, null, 2));

  // Check IndexedDB
  const idbDatabases = await page.evaluate(async () => {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      return dbs.map(d => d.name);
    }
    return ['indexedDB.databases() not supported'];
  });
  console.log('\n--- INDEXEDDB DATABASES ---');
  console.log(idbDatabases);

  console.log('\n5. Clicking Attendance card...');
  // Click the attendance link
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Navigation wait:', e.message)),
    page.click('#link-attendance')
  ]);

  // Wait extra 3 seconds for React Router client mounts/redirects
  await new Promise(r => setTimeout(r, 3000));

  const currentUrl = page.url();
  console.log('\n6. Current URL after clicking Attendance:', currentUrl);

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  // Check DOM text
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('\n7. Visible Screen Content (first 500 chars):\n', bodyText);

  // Screenshot
  const screenshotPath = path.join(__dirname, 'attendance_browser_result.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('\nScreenshot saved to:', screenshotPath);

  // Check LocalStorage again
  const lsAfterAttendance = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const obj = {};
    keys.forEach(k => obj[k] = localStorage.getItem(k));
    return obj;
  });
  console.log('\n--- LOCALSTORAGE AFTER ATTENDANCE NAVIGATION ---');
  console.log(JSON.stringify(lsAfterAttendance, null, 2));

  console.log('\n--- CONSOLE LOGS & ERRORS CAPTURED ---');
  consoleLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

  await browser.close();
  console.log('\n--- TEST COMPLETE ---');
})();
