const db = require('../config/db');
const complaintService = require('../services/complaintService');
const noticeService = require('../services/noticeService');
const messService = require('../services/messService');
const gatePassService = require('../services/gatePassService');
const visitorService = require('../services/visitorService');
const leaveService = require('../services/leaveService');

const adminUser = {
  id: 1,
  username: 'admin',
  role: 'SUPER_ADMIN'
};

async function testStep4() {
  console.log('Testing modules with real MySQL database (empty tables)...');

  // 1. Complaints
  try {
    const complaints = await complaintService.getComplaints({}, adminUser);
    console.log('  [OK] Complaints queried successfully:', complaints);
  } catch (e) {
    console.error('  [FAIL] Complaints query error:', e.message);
  }

  // 2. Notices
  try {
    const notices = await noticeService.getNotices({}, adminUser);
    console.log('  [OK] Notices queried successfully:', notices);
  } catch (e) {
    console.error('  [FAIL] Notices query error:', e.message);
  }

  // 3. Mess Menu
  try {
    const mess = await messService.getMenus({ hostelId: 1 });
    console.log('  [OK] Mess menus queried successfully:', mess);
  } catch (e) {
    console.error('  [FAIL] Mess menus query error:', e.message);
  }

  // 4. Gate Passes
  try {
    const gatePasses = await gatePassService.getGatePasses({}, adminUser);
    console.log('  [OK] Gate Passes queried successfully:', gatePasses);
  } catch (e) {
    console.error('  [FAIL] Gate Passes query error:', e.message);
  }

  // 5. Visitors
  try {
    const visitors = await visitorService.getVisits({}, adminUser);
    console.log('  [OK] Visitors queried successfully:', visitors);
  } catch (e) {
    console.error('  [FAIL] Visitors query error:', e.message);
  }

  // 6. Leaves
  try {
    const leaves = await leaveService.getLeaveApplications({}, adminUser);
    console.log('  [OK] Leave applications queried successfully:', leaves);
  } catch (e) {
    console.error('  [FAIL] Leave applications query error:', e.message);
  }

  console.log('Step 4 tests completed.');
  process.exit(0);
}

testStep4().catch(err => {
  console.error('TestStep4 uncaught error:', err);
  process.exit(1);
});
