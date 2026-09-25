const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('====================================================');
  console.log('🧪 REAL CHROME DEVTOOLS VERIFICATION SUITE');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const consoleEntries = [];
  page.on('console', msg => {
    consoleEntries.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    consoleEntries.push({ type: 'pageerror', text: err.toString() });
  });

  // STEP 1: Doorway
  console.log('\n[STEP 1] Navigating to doorway http://localhost:5002...');
  await page.goto('http://localhost:5002', { waitUntil: 'networkidle2' });

  console.log('[STEP 2] Entering credentials: BEC26002 / 2004-06-18...');
  await page.type('#login-identifier', 'BEC26002');
  await page.type('#login-password', '2004-06-18');
  await page.click('#login-submit-btn');

  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 10000 });

  console.log('[STEP 3] Doorway Login Success! Waiting 2s for Firebase SDK to complete sync...');
  await new Promise(r => setTimeout(r, 2000));

  const userName = await page.$eval('#dash-user-name', el => el.textContent.trim());
  console.log(`✓ Doorway User Name: "${userName}"`);

  // LocalStorage Inspection
  const lsData = await page.evaluate(() => {
    const res = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      res[k] = localStorage.getItem(k);
    }
    return res;
  });
  console.log('\n[DEVTOOLS] LocalStorage Keys Found:', Object.keys(lsData));
  console.log('  bec_session_user:', lsData.bec_session_user ? 'FOUND (role: ' + JSON.parse(lsData.bec_session_user).role + ')' : 'MISSING');
  console.log('  authToken:', lsData.authToken ? 'FOUND' : 'MISSING');
  console.log('  portalToken:', lsData.portalToken ? 'FOUND' : 'MISSING');

  // IndexedDB Inspection
  const idbRecords = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const openReq = indexedDB.open('firebaseLocalStorageDb');
      openReq.onerror = () => resolve({ status: 'error' });
      openReq.onsuccess = () => {
        const db = openReq.result;
        try {
          const tx = db.transaction('firebaseLocalStorage', 'readonly');
          const store = tx.objectStore('firebaseLocalStorage');
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => resolve({ status: 'ok', records: getAllReq.result });
          getAllReq.onerror = () => resolve({ status: 'store_error' });
        } catch (e) {
          resolve({ status: 'tx_error', message: e.message });
        }
      };
    });
  });

  console.log('\n[DEVTOOLS] IndexedDB firebaseLocalStorageDb:');
  if (idbRecords.records && idbRecords.records.length > 0) {
    const rec = idbRecords.records[0];
    console.log('  ✓ Firebase session active!');
    console.log('  fbase_key:', rec.fbase_key);
    console.log('  uid:', rec.value?.uid);
    console.log('  email:', rec.value?.email);
  } else {
    console.log('  ✗ No records in firebaseLocalStorageDb:', idbRecords);
  }

  // STEP 4: Test Attendance Click
  console.log('\n[STEP 4] Clicking "Attendance" Card...');
  await page.click('#link-attendance');
  await new Promise(r => setTimeout(r, 3500));

  const attendanceUrl = page.url();
  const attendanceTitle = await page.title();
  const attendanceText = await page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' '));

  console.log(`  Current URL: ${attendanceUrl}`);
  console.log(`  Page Title: ${attendanceTitle}`);
  console.log(`  Visible Text: ${attendanceText}`);

  const attendanceScreenshot = path.join(__dirname, 'attendance_verified.png');
  await page.screenshot({ path: attendanceScreenshot, fullPage: true });
  console.log(`  ✓ Screenshot saved: ${attendanceScreenshot}`);

  // STEP 5: Test Hostel Click
  console.log('\n[STEP 5] Testing Hostel Navigation...');
  await page.goto('http://localhost:5002', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 5000 });

  await page.click('#link-hostel');
  await new Promise(r => setTimeout(r, 4000));

  const hostelUrl = page.url();
  const hostelTitle = await page.title();
  const hostelText = await page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' '));

  console.log(`  Current URL: ${hostelUrl}`);
  console.log(`  Page Title: ${hostelTitle}`);
  console.log(`  Visible Text: ${hostelText}`);

  const hostelScreenshot = path.join(__dirname, 'hostel_verified.png');
  await page.screenshot({ path: hostelScreenshot, fullPage: true });
  console.log(`  ✓ Screenshot saved: ${hostelScreenshot}`);

  console.log('\n====================================================');
  console.log('CONSOLE LOGS & ERRORS:');
  const errorsOnly = consoleEntries.filter(e => e.type === 'error' || e.type === 'pageerror');
  if (errorsOnly.length > 0) {
    console.log(`Found ${errorsOnly.length} error(s):`);
    errorsOnly.forEach(e => console.log(`  [${e.type}] ${e.text}`));
  } else {
    console.log('  ✓ No console errors!');
  }
  console.log('====================================================\n');

  await browser.close();
})();
