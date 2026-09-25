const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  console.log('--- STARTING HOSTEL REAL CHROME TEST ---');
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
  await page.click('#login-submit-btn');

  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 10000 });

  console.log('3. Clicking Hostel card...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Navigation wait:', e.message)),
    page.click('#link-hostel')
  ]);

  await new Promise(r => setTimeout(r, 4000));

  const currentUrl = page.url();
  console.log('4. Current URL after clicking Hostel:', currentUrl);

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('\n5. Visible Screen Content:\n', bodyText);

  const screenshotPath = path.join(__dirname, 'hostel_browser_result.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  console.log('\n--- CONSOLE LOGS & ERRORS ---');
  consoleLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

  await browser.close();
})();
