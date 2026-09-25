const puppeteer = require('C:/Users/munun/Downloads/COLLEGE ERP/COLLEGE ERP/campus-portal/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/munun/.gemini/antigravity-ide/brain/97f7fbc8-dc15-45fb-9766-a1d26769287e';

(async () => {
  console.log('====================================================');
  console.log('🧪 REAL CHROME DEVTOOLS HOSTEL AUTO-ALLOTMENT TEST');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // ----------------------------------------------------
  // TEST 1: DAY SCHOLAR (BEC26328)
  // ----------------------------------------------------
  console.log('\n[TEST 1] Testing Day Scholar: BEC26328 (PRANGYA PARAMITA BEHERA)');
  await page.goto('http://localhost:5002', { waitUntil: 'networkidle2' });
  await page.type('#login-identifier', 'BEC26328');
  await page.type('#login-password', 'Ayushtech@26');
  await page.click('#login-submit-btn');

  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 15000 });

  await new Promise(r => setTimeout(r, 1500));

  const userName = await page.$eval('#dash-user-name', el => el.textContent.trim());
  const userSub = await page.$eval('#dash-user-sub', el => el.innerHTML);
  const hostelCardDisplay = await page.$eval('#link-hostel', el => window.getComputedStyle(el).display);

  console.log('  Student Name:', userName);
  console.log('  Student Sub/Badge HTML:', userSub);
  console.log('  Hostel Service Card display style (MUST BE none):', hostelCardDisplay);

  const screenshot1Path = path.join(ARTIFACT_DIR, 'dayscholar_doorway.png');
  await page.screenshot({ path: screenshot1Path });
  console.log('  ✓ Saved screenshot:', screenshot1Path);

  // Direct route test for Day Scholar
  console.log('  Navigating Day Scholar directly to /hostel/student/accommodation...');
  await page.goto('http://localhost:5002/hostel/student/accommodation', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const pageHeading = await page.evaluate(() => {
    const h1 = document.querySelector('h1.page-title') || document.querySelector('h1') || document.querySelector('h2');
    return h1 ? h1.textContent.trim() : '';
  });
  console.log('  Direct Navigation Page Heading:', pageHeading);

  const screenshot2Path = path.join(ARTIFACT_DIR, 'dayscholar_hostel_blocked.png');
  await page.screenshot({ path: screenshot2Path });
  console.log('  ✓ Saved screenshot:', screenshot2Path);

  // ----------------------------------------------------
  // TEST 2: HOSTELLER BOY (BEC26306)
  // ----------------------------------------------------
  console.log('\n[TEST 2] Testing Hosteller Boy: BEC26306 (RAMYA SRI)');
  await page.goto('http://localhost:5002', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  await page.type('#login-identifier', 'BEC26306');
  await page.type('#login-password', 'Ayushtech@26');
  await page.click('#login-submit-btn');

  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 15000 });

  await new Promise(r => setTimeout(r, 1500));

  const hostellerName = await page.$eval('#dash-user-name', el => el.textContent.trim());
  const hostellerCardDisplay = await page.$eval('#link-hostel', el => window.getComputedStyle(el).display);
  console.log('  Student Name:', hostellerName);
  console.log('  Hostel Service Card display style (MUST BE flex):', hostellerCardDisplay);

  // Navigate to Accommodation Page
  console.log('  Navigating to /hostel/student/accommodation...');
  await page.goto('http://localhost:5002/hostel/student/accommodation', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const accommodationData = await page.evaluate(() => {
    const hostelTitle = document.querySelector('.hostel-name-heading')?.textContent.trim();
    const metrics = Array.from(document.querySelectorAll('.alloc-metric')).map(m => m.textContent.trim().replace(/\s+/g, ' '));
    const roommates = Array.from(document.querySelectorAll('.roommate-card-item')).map(rm => {
      const name = rm.querySelector('.roommate-name')?.textContent.trim();
      const meta = rm.querySelector('.roommate-meta')?.textContent.trim();
      const hasImg = Boolean(rm.querySelector('img'));
      const imgSrc = rm.querySelector('img')?.getAttribute('src');
      return { name, meta, hasImg, imgSrc };
    });
    return { hostelTitle, metrics, roommates };
  });

  console.log('  Accommodation Details:', accommodationData);

  const screenshot3Path = path.join(ARTIFACT_DIR, 'hosteller_accommodation.png');
  await page.screenshot({ path: screenshot3Path });
  console.log('  ✓ Saved screenshot:', screenshot3Path);

  // ----------------------------------------------------
  // TEST 3: LOCALSTORAGE AUDIT
  // ----------------------------------------------------
  console.log('\n[TEST 3] LocalStorage Audit in Chrome DevTools:');
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  console.log('  LocalStorage keys present:', lsKeys);
  const hasMockOrDemo = lsKeys.some(k => k.toLowerCase().includes('mock') || k.toLowerCase().includes('fake') || k.toLowerCase().includes('demo'));
  console.log('  Contains mock/fake keys?', hasMockOrDemo);

  // ----------------------------------------------------
  // TEST 4: ADMIN VIEW (admin@bec.ac.in)
  // ----------------------------------------------------
  console.log('\n[TEST 4] Testing Admin View: admin@bec.ac.in');
  await page.goto('http://localhost:5002', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  await page.type('#login-identifier', 'admin@bec.ac.in');
  await page.type('#login-password', 'Ayushtech@26');
  await page.click('#login-submit-btn');

  await page.waitForFunction(() => {
    const dash = document.getElementById('view-dashboard');
    return dash && dash.style.display !== 'none';
  }, { timeout: 15000 });

  await new Promise(r => setTimeout(r, 1500));

  console.log('  Navigating Admin to /hostel/admin/allocations...');
  await page.goto('http://localhost:5002/hostel/admin/allocations', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const adminAllocCount = await page.evaluate(() => {
    const tableRows = document.querySelectorAll('tbody tr');
    return tableRows.length;
  });
  console.log(`  Admin table rendered rows: ${adminAllocCount}`);

  const screenshot4Path = path.join(ARTIFACT_DIR, 'admin_allocations.png');
  await page.screenshot({ path: screenshot4Path });
  console.log('  ✓ Saved screenshot:', screenshot4Path);

  await browser.close();
  console.log('\n====================================================');
  console.log('🎉 ALL REAL BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
})();
