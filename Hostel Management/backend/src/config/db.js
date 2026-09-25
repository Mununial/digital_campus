const mysql = require('mysql2/promise');
const env = require('./env');

// Seed Dataset for Mock fallback
const MOCK_ROLES = [
  { id: 1, name: 'SUPER_ADMIN' },
  { id: 2, name: 'SUPERINTENDENT' },
  { id: 3, name: 'STUDENT' }
];

const MOCK_HOSTELS = [
  { id: 1, name: 'BEC Boys Hostel 1', code: 'BBH1', gender: 'MALE', location: 'North Campus, Block A', status: 'ACTIVE' },
  { id: 2, name: 'BEC Girls Hostel 1', code: 'BGH1', gender: 'FEMALE', location: 'North Campus, Block B', status: 'ACTIVE' },
  { id: 3, name: 'BEC Boys Hostel', code: 'BBH', gender: 'MALE', location: 'West Campus, Sector 1', status: 'ACTIVE' },
  { id: 4, name: 'BEC Kara Hostel', code: 'BKH', gender: 'FEMALE', location: 'West Campus, Sector 2', status: 'ACTIVE' },
  { id: 5, name: 'Barmunda Boys Hostel', code: 'BMBH', gender: 'MALE', location: 'Barmunda Sub-campus', status: 'ACTIVE' },
  { id: 6, name: 'Barmunda Girls Hostel', code: 'BMGH', gender: 'FEMALE', location: 'Barmunda Sub-campus', status: 'ACTIVE' }
];

let MOCK_USERS = [
  { id: 1, role_id: 1, role: 'SUPER_ADMIN', username: 'superadmin', email: 'superadmin@bec.ac.in', password_hash: '$2a$10$VN2wkLHgI7QBqqPT/ZMi8u0foOLwclrTVBu1NYe1VuZY1.NXqXYKC', status: 'ACTIVE', gender: 'MALE', must_change_password: 0, last_login_at: null },
  { id: 5, role_id: 1, role: 'SUPER_ADMIN', username: 'ayush', email: 'ayush@bec.ac.in', password_hash: '$2a$10$VN2wkLHgI7QBqqPT/ZMi8u0foOLwclrTVBu1NYe1VuZY1.NXqXYKC', status: 'ACTIVE', gender: 'MALE', must_change_password: 0, last_login_at: null },
  { id: 6, role_id: 1, role: 'SUPER_ADMIN', username: 'admin', email: 'admin@bec.ac.in', password_hash: '$2a$10$VN2wkLHgI7QBqqPT/ZMi8u0foOLwclrTVBu1NYe1VuZY1.NXqXYKC', status: 'ACTIVE', gender: 'MALE', must_change_password: 0, last_login_at: null },
  { id: 2, role_id: 2, role: 'SUPERINTENDENT', username: 'warden', email: 'warden@hostel.com', password_hash: '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', status: 'ACTIVE', gender: 'MALE', must_change_password: 0, last_login_at: null },
  { id: 3, role_id: 3, role: 'STUDENT', username: 'student', email: 'student@hostel.com', password_hash: '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', status: 'ACTIVE', gender: 'MALE', must_change_password: 0, last_login_at: null },
  { id: 4, role_id: 3, role: 'STUDENT', username: 'student2', email: 'student2@hostel.com', password_hash: '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', status: 'ACTIVE', gender: 'FEMALE', must_change_password: 0, last_login_at: null },
  { id: 11, role_id: 3, role: 'STUDENT', username: 'bablubag', email: 'bablubag@bec.ac.in', password_hash: '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', status: 'ACTIVE', gender: 'FEMALE', must_change_password: 0, last_login_at: null }
];

let MOCK_SECURITY_AUDIT_LOG = [];

let MOCK_FLOORS = [
  { id: 1, hostel_id: 1, floor_number: 1, floor_name: 'Ground Floor', status: 'ACTIVE', created_at: new Date().toISOString() },
  { id: 2, hostel_id: 1, floor_number: 2, floor_name: 'Second Floor', status: 'ACTIVE', created_at: new Date().toISOString() },
  { id: 3, hostel_id: 2, floor_number: 1, floor_name: 'Ground Floor', status: 'ACTIVE', created_at: new Date().toISOString() }
];

let MOCK_ROOMS = [
  { id: 1, hostel_id: 1, floor_id: 1, room_number: '101', capacity: 2, status: 'ACTIVE', created_at: new Date().toISOString() },
  { id: 2, hostel_id: 1, floor_id: 1, room_number: '102', capacity: 2, status: 'ACTIVE', created_at: new Date().toISOString() },
  { id: 3, hostel_id: 1, floor_id: 2, room_number: '201', capacity: 2, status: 'ACTIVE', created_at: new Date().toISOString() },
  { id: 4, hostel_id: 2, floor_id: 3, room_number: 'G-101', capacity: 2, status: 'ACTIVE', created_at: new Date().toISOString() },
  { id: 5, hostel_id: 2, floor_id: 3, room_number: 'G-102', capacity: 2, status: 'ACTIVE', created_at: new Date().toISOString() }
];

let MOCK_BEDS = [
  { id: 1, room_id: 1, bed_number: 'A-1', status: 'OCCUPIED', created_at: new Date().toISOString() },
  { id: 2, room_id: 1, bed_number: 'A-2', status: 'OCCUPIED', created_at: new Date().toISOString() },
  { id: 3, room_id: 2, bed_number: 'B-1', status: 'AVAILABLE', created_at: new Date().toISOString() },
  { id: 4, room_id: 4, bed_number: 'GA-1', status: 'AVAILABLE', created_at: new Date().toISOString() },
  { id: 5, room_id: 4, bed_number: 'GA-2', status: 'AVAILABLE', created_at: new Date().toISOString() },
  { id: 6, room_id: 5, bed_number: 'GB-1', status: 'AVAILABLE', created_at: new Date().toISOString() }
];

const MOCK_SUPER_HOSTELS = [
  { id: 1, user_id: 2, hostel_id: 1 },
  { id: 2, user_id: 2, hostel_id: 3 }
];

let MOCK_STUDENTS = [
  {
    id: 1,
    user_id: 3,
    hostel_id: 1,
    student_id: 'STD2026001',
    roll_number: 'CSE-2026-089',
    full_name: 'John Doe',
    phone: '9876543210',
    email: 'student@hostel.com',
    branch: 'Computer Science',
    course: 'B.Tech',
    year: 3,
    semester: 5,
    bed_id: 1,
    hostel_name: 'BEC Boys Hostel 1',
    room_number: '101',
    bed_number: 'A-1',
    admission_date: '2024-07-15T00:00:00.000Z',
    status: 'ACTIVE'
  },
  {
    id: 2,
    user_id: 4,
    hostel_id: 1,
    student_id: 'STD2026002',
    roll_number: 'CSE-2026-090',
    full_name: 'Jane Smith',
    phone: '9876543211',
    email: 'student2@hostel.com',
    branch: 'Computer Science',
    course: 'B.Tech',
    year: 3,
    semester: 5,
    bed_id: 2,
    hostel_name: 'BEC Boys Hostel 1',
    room_number: '102',
    bed_number: 'A-2',
    admission_date: '2024-07-15T00:00:00.000Z',
    status: 'ACTIVE'
  },
  {
    id: 11,
    user_id: 11,
    hostel_id: 2,
    student_id: 'STD2026011',
    roll_number: 'bablubag',
    full_name: 'bablubag',
    phone: '9876543212',
    email: 'bablubag@bec.ac.in',
    branch: 'Computer Science',
    course: 'B.Tech',
    year: 1,
    semester: 1,
    bed_id: 4,
    hostel_name: 'BEC Girls Hostel 1',
    room_number: 'G-101',
    bed_number: 'GA-1',
    admission_date: '2026-07-15T00:00:00.000Z',
    status: 'ACTIVE'
  }
];

let MOCK_NOTICES = [
  {
    id: 1,
    title: 'Hostel Maintenance Schedule',
    description: 'Routine plumbing and electrical inspections will take place across all blocks this coming weekend. Please ensure your rooms are accessible.',
    created_by: 1,
    creator_name: 'superadmin',
    hostel_id: null,
    hostel_name: null,
    priority: 'IMPORTANT',
    status: 'PUBLISHED',
    published_at: new Date('2026-08-20T10:00:00Z').toISOString(),
    expires_at: new Date('2026-09-20T10:00:00Z').toISOString(),
    created_at: new Date('2026-08-20T09:00:00Z').toISOString(),
    updated_at: new Date('2026-08-20T10:00:00Z').toISOString()
  },
  {
    id: 2,
    title: 'Water Tank Cleaning Notice - BEC Boys',
    description: 'The overhead water tank for BEC Boys Hostel 1 will undergo deep cleaning on Sunday between 8:00 AM and 1:00 PM. Water supply will be paused during this period.',
    created_by: 2,
    creator_name: 'warden',
    hostel_id: 1,
    hostel_name: 'BEC Boys Hostel 1',
    priority: 'URGENT',
    status: 'PUBLISHED',
    published_at: new Date('2026-08-22T08:00:00Z').toISOString(),
    expires_at: new Date('2026-08-29T08:00:00Z').toISOString(),
    created_at: new Date('2026-08-22T07:30:00Z').toISOString(),
    updated_at: new Date('2026-08-22T08:00:00Z').toISOString()
  },
  {
    id: 3,
    title: 'Library Extension Hours Notice',
    description: 'The sub-campus study hall and library reading rooms will remain open until 11:00 PM during the mid-semester examination period.',
    created_by: 1,
    creator_name: 'superadmin',
    hostel_id: null,
    hostel_name: null,
    priority: 'GENERAL',
    status: 'PUBLISHED',
    published_at: new Date('2026-08-21T12:00:00Z').toISOString(),
    expires_at: new Date('2026-09-05T12:00:00Z').toISOString(),
    created_at: new Date('2026-08-21T11:00:00Z').toISOString(),
    updated_at: new Date('2026-08-21T12:00:00Z').toISOString()
  },
  {
    id: 4,
    title: 'Upcoming Hostel Sports Tournament Draft',
    description: 'Draft announcement for the annual Inter-Hostel Table Tennis and Carrom Championship.',
    created_by: 2,
    creator_name: 'warden',
    hostel_id: 1,
    hostel_name: 'BEC Boys Hostel 1',
    priority: 'GENERAL',
    status: 'DRAFT',
    published_at: null,
    expires_at: null,
    created_at: new Date('2026-08-23T06:00:00Z').toISOString(),
    updated_at: new Date('2026-08-23T06:00:00Z').toISOString()
  }
];

let MOCK_NOTICE_READS = [];

let MOCK_COMPLAINTS = [
  {
    id: 1,
    student_id: 1,
    hostel_id: 1,
    category: 'PLUMBING',
    priority: 'HIGH',
    title: 'Bathroom Water Leakage in Room 101',
    description: 'Continuous water dripping from the sink tap creating a puddle near the door.',
    status: 'IN_PROGRESS',
    assigned_to: 2,
    resolution: null,
    resolved_at: null,
    closed_at: null,
    created_at: new Date('2026-08-22T08:00:00Z').toISOString(),
    updated_at: new Date('2026-08-22T09:00:00Z').toISOString()
  },
  {
    id: 2,
    student_id: 1,
    hostel_id: 1,
    category: 'ELECTRICITY',
    priority: 'URGENT',
    title: 'Study Light Socket Short Circuit',
    description: 'Power outlet sparking when plugging in laptop charger. Needs urgent repair.',
    status: 'OPEN',
    assigned_to: null,
    resolution: null,
    resolved_at: null,
    closed_at: null,
    created_at: new Date('2026-08-23T06:00:00Z').toISOString(),
    updated_at: new Date('2026-08-23T06:00:00Z').toISOString()
  },
  {
    id: 3,
    student_id: 1,
    hostel_id: 1,
    category: 'FAN_AC',
    priority: 'MEDIUM',
    title: 'Ceiling Fan Making Loud Noise',
    description: 'Ceiling fan wobble and squeaking sound at high speed setting.',
    status: 'RESOLVED',
    assigned_to: 2,
    resolution: 'Tightened fan mounting brackets and lubricated motor bearing.',
    resolved_at: new Date('2026-08-23T11:00:00Z').toISOString(),
    closed_at: null,
    created_at: new Date('2026-08-21T09:00:00Z').toISOString(),
    updated_at: new Date('2026-08-23T11:00:00Z').toISOString()
  }
];

let MOCK_COMPLAINT_HISTORY = [
  { id: 1, complaint_id: 1, changed_by: 3, old_status: null, new_status: 'OPEN', comment: 'Complaint submitted by student.', created_at: new Date('2026-08-22T08:00:00Z').toISOString() },
  { id: 2, complaint_id: 1, changed_by: 2, old_status: 'OPEN', new_status: 'IN_PROGRESS', comment: 'Maintenance warden assigned plumbing team.', created_at: new Date('2026-08-22T09:00:00Z').toISOString() },
  { id: 3, complaint_id: 3, changed_by: 3, old_status: null, new_status: 'OPEN', comment: 'Complaint submitted by student.', created_at: new Date('2026-08-21T09:00:00Z').toISOString() },
  { id: 4, complaint_id: 3, changed_by: 2, old_status: 'OPEN', new_status: 'IN_PROGRESS', comment: 'Assigned electrician.', created_at: new Date('2026-08-22T10:00:00Z').toISOString() },
  { id: 5, complaint_id: 3, changed_by: 2, old_status: 'IN_PROGRESS', new_status: 'RESOLVED', comment: 'Tightened fan mounting brackets and lubricated motor bearing.', created_at: new Date('2026-08-23T11:00:00Z').toISOString() }
];

let MOCK_COMPLAINT_COMMENTS = [
  { id: 1, complaint_id: 1, user_id: 3, comment: 'Dripping has increased since morning.', is_internal: 0, created_at: new Date('2026-08-22T08:30:00Z').toISOString() }
];

let MOCK_MAINTENANCE_REQUESTS = [
  {
    id: 1,
    hostel_id: 1,
    floor_id: 1,
    room_id: 1,
    bed_id: 1,
    category: 'PLUMBING',
    title: 'Leaking Washbasin Tap',
    description: 'Water leaking underneath washbasin tap',
    priority: 'MEDIUM',
    status: 'OPEN',
    reported_by: 3,
    student_id: 1,
    assigned_to: null,
    resolution_note: null,
    reported_at: new Date('2026-08-23T10:00:00Z').toISOString(),
    started_at: null,
    resolved_at: null,
    created_at: new Date('2026-08-23T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-23T10:00:00Z').toISOString()
  }
];

let MOCK_MAINTENANCE_UPDATES = [
  {
    id: 1,
    maintenance_id: 1,
    user_id: 3,
    message: 'Maintenance request reported by student.',
    old_status: null,
    new_status: 'OPEN',
    created_at: new Date('2026-08-23T10:00:00Z').toISOString()
  }
];

let MOCK_ROOM_INSPECTIONS = [
  {
    id: 1,
    hostel_id: 1,
    floor_id: 1,
    room_id: 1,
    inspected_by: 2,
    inspection_date: new Date().toISOString().split('T')[0],
    cleanliness_status: 'GOOD',
    electrical_status: 'GOOD',
    plumbing_status: 'ATTENTION_REQUIRED',
    furniture_status: 'GOOD',
    bed_status: 'GOOD',
    safety_status: 'GOOD',
    remarks: 'Water leakage checked.',
    created_at: new Date().toISOString()
  }
];

let MOCK_ACTIVITY_LOGS = [];

let MOCK_VISITS = [
  {
    id: 1,
    student_id: 1,
    hostel_id: 1,
    room_id: 1,
    bed_id: 1,
    visitor_name: 'Robert Doe',
    visitor_phone: '9876543210',
    visitor_email: 'robert.doe@example.com',
    visitor_type: 'PARENT',
    purpose: 'Delivering personal belongings and books.',
    identification_type: 'Aadhaar',
    identification_last4: '4321',
    visit_date: new Date().toISOString().split('T')[0],
    expected_check_in: new Date(Date.now() - 3600000).toISOString(),
    expected_check_out: new Date(Date.now() + 14400000).toISOString(),
    actual_check_in: new Date(Date.now() - 3000000).toISOString(),
    actual_check_out: null,
    status: 'CHECKED_IN',
    created_by: 3,
    approved_by: 2,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3000000).toISOString()
  },
  {
    id: 2,
    student_id: 1,
    hostel_id: 1,
    room_id: 1,
    bed_id: 1,
    visitor_name: 'Michael Smith',
    visitor_phone: '9123456789',
    visitor_email: 'michael.s@example.com',
    visitor_type: 'RELATIVE',
    purpose: 'Family weekend visit.',
    identification_type: 'Voter ID',
    identification_last4: '8765',
    visit_date: new Date().toISOString().split('T')[0],
    expected_check_in: new Date(Date.now() + 3600000).toISOString(),
    expected_check_out: new Date(Date.now() + 10800000).toISOString(),
    actual_check_in: null,
    actual_check_out: null,
    status: 'APPROVED',
    created_by: 3,
    approved_by: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString()
  }
];

let MOCK_VISITOR_HISTORY = [
  { id: 1, visit_id: 1, changed_by: 3, old_status: null, new_status: 'REQUESTED', comment: 'Visitor request submitted by student.', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 2, visit_id: 1, changed_by: 2, old_status: 'REQUESTED', new_status: 'APPROVED', comment: 'Approved by warden.', created_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 3, visit_id: 1, changed_by: 2, old_status: 'APPROVED', new_status: 'CHECKED_IN', comment: 'Visitor checked in at main gate.', created_at: new Date(Date.now() - 3000000).toISOString() }
];

let MOCK_MESS_MENUS = [
  { id: 1, hostel_id: 1, menu_date: new Date().toISOString().split('T')[0], meal_type: 'BREAKFAST', meal_name: 'Idli, Sambar & Coconut Chutney', description: 'Freshly steamed rice idlis with hot sambar', is_available: 1, created_by: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, hostel_id: 1, menu_date: new Date().toISOString().split('T')[0], meal_type: 'LUNCH', meal_name: 'Steamed Rice, Dal Tadka, Mix Veg & Curd', description: 'Balanced thali with seasonal vegetables', is_available: 1, created_by: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, hostel_id: 1, menu_date: new Date().toISOString().split('T')[0], meal_type: 'SNACKS', meal_name: 'Masala Tea & Veg Cutlets', description: 'Evening refreshment', is_available: 1, created_by: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 4, hostel_id: 1, menu_date: new Date().toISOString().split('T')[0], meal_type: 'DINNER', meal_name: 'Butter Roti, Paneer Butter Masala & Jeera Rice', description: 'Rich dinner spread with dessert', is_available: 1, created_by: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

let MOCK_MEAL_ATTENDANCE = [
  { id: 1, student_id: 1, hostel_id: 1, meal_date: new Date().toISOString().split('T')[0], meal_type: 'BREAKFAST', status: 'TAKING', marked_at: new Date().toISOString() },
  { id: 2, student_id: 1, hostel_id: 1, meal_date: new Date().toISOString().split('T')[0], meal_type: 'LUNCH', status: 'TAKING', marked_at: new Date().toISOString() },
  { id: 3, student_id: 1, hostel_id: 1, meal_date: new Date().toISOString().split('T')[0], meal_type: 'SNACKS', status: 'NOT_TAKING', marked_at: new Date().toISOString() },
  { id: 4, student_id: 1, hostel_id: 1, meal_date: new Date().toISOString().split('T')[0], meal_type: 'DINNER', status: 'TAKING', marked_at: new Date().toISOString() }
];

let MOCK_FEE_STRUCTURES = [
  { id: 1, hostel_id: 1, fee_type: 'HOSTEL_FEE', name: 'Annual Hostel Accommodation Fee 2026-27', description: 'Standard room rent and facilities for academic year 2026-27', amount: 30000.00, frequency: 'YEARLY', academic_year: '2026-27', applicable_course: 'B.Tech', applicable_branch: null, applicable_year: null, is_active: 1, created_by: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, hostel_id: 1, fee_type: 'MESS_FEE', name: 'Semester Mess Charges 2026-27', description: 'Four daily meals coverage for semester 5', amount: 15000.00, frequency: 'SEMESTER', academic_year: '2026-27', applicable_course: null, applicable_branch: null, applicable_year: null, is_active: 1, created_by: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, hostel_id: null, fee_type: 'SECURITY_DEPOSIT', name: 'One-Time Hostel Security Deposit', description: 'Refundable security deposit at admission', amount: 5000.00, frequency: 'ONE_TIME', academic_year: '2026-27', applicable_course: null, applicable_branch: null, applicable_year: null, is_active: 1, created_by: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

let MOCK_STUDENT_FEES = [
  { id: 1, student_id: 1, hostel_id: 1, fee_structure_id: 1, academic_year: '2026-27', amount: 30000.00, paid_amount: 10000.00, due_date: new Date(Date.now() + 30*86400000).toISOString().split('T')[0], status: 'PARTIAL', waiver_reason: null, waived_by: null, waived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, student_id: 1, hostel_id: 1, fee_structure_id: 2, academic_year: '2026-27', amount: 15000.00, paid_amount: 15000.00, due_date: new Date(Date.now() - 10*86400000).toISOString().split('T')[0], status: 'PAID', waiver_reason: null, waived_by: null, waived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, student_id: 2, hostel_id: 1, fee_structure_id: 1, academic_year: '2026-27', amount: 30000.00, paid_amount: 0.00, due_date: new Date(Date.now() - 5*86400000).toISOString().split('T')[0], status: 'OVERDUE', waiver_reason: null, waived_by: null, waived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

let MOCK_FEE_PAYMENTS = [
  { id: 1, student_fee_id: 1, student_id: 1, hostel_id: 1, amount: 10000.00, payment_method: 'UPI', receipt_number: 'FEE-2026-000001', transaction_reference: 'UPI1234567890', payment_date: new Date().toISOString().split('T')[0], received_by: 2, notes: 'First installment paid via UPI', created_at: new Date().toISOString() },
  { id: 2, student_fee_id: 2, student_id: 1, hostel_id: 1, amount: 15000.00, payment_method: 'BANK_TRANSFER', receipt_number: 'FEE-2026-000002', transaction_reference: 'NFT9876543210', payment_date: new Date().toISOString().split('T')[0], received_by: 2, notes: 'Full semester mess fee', created_at: new Date().toISOString() }
];

let MOCK_FEE_HISTORY = [
  { id: 1, student_fee_id: 1, changed_by: 1, action: 'ASSIGNED', old_value: null, new_value: '30000.00', reason: 'Fee assigned to student', created_at: new Date().toISOString() },
  { id: 2, student_fee_id: 1, changed_by: 2, action: 'PAYMENT_RECORDED', old_value: 'Paid: ₹0.00, Status: PENDING', new_value: 'Paid: ₹10000.00, Status: PARTIAL', reason: 'Payment of ₹10000.00 recorded via UPI. Receipt: FEE-2026-000001', created_at: new Date().toISOString() }
];

let MOCK_STUDENT_ALLOCATIONS = [
  { id: 1, student_id: 1, hostel_id: 1, room_id: 1, bed_id: 1, allocated_from: '2026-08-01', allocated_until: null, status: 'ACTIVE', allocated_by: 1, checkout_reason: null, transfer_reason: null, custom_reason: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, student_id: 2, hostel_id: 1, room_id: 1, bed_id: 2, allocated_from: '2026-08-01', allocated_until: null, status: 'ACTIVE', allocated_by: 1, checkout_reason: null, transfer_reason: null, custom_reason: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

let isOffline = false;

// Initialize the actual MySQL connection pool
const realPool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.name,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// A lightweight Mock Query Parser simulating SQL database operations
const mockQuery = async (sql, params = []) => {
  const queryLower = sql.toLowerCase();
  if (queryLower.includes('visits')) {
    // console.log('MOCK_VISITS QUERY:', sql, params);
  }

  // 1a. INSERT INTO users
  if (queryLower.includes('into users')) {
    const username = params[0];
    const email = params[1];
    const fullName = params[2];
    const gender = params[3] || 'MALE';
    const phone = params[4] || '';
    const passwordHash = params[5] || '';
    const existing = MOCK_USERS.find(u => u.username === username || (email && u.email === email));
    if (existing) {
      return [{ insertId: existing.id, affectedRows: 1 }];
    }
    const newId = Math.max(...MOCK_USERS.map(u => typeof u.id === 'number' ? u.id : 0), 10) + 1;
    const newUser = {
      id: newId,
      role_id: 3,
      role: 'STUDENT',
      username,
      email,
      full_name: fullName,
      gender,
      phone,
      password_hash: passwordHash,
      status: 'ACTIVE',
      must_change_password: 0,
      last_login_at: null
    };
    MOCK_USERS.push(newUser);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 1b. INSERT INTO students
  if (queryLower.includes('into students')) {
    const userId = Number(params[0]);
    const studentCode = params[1] || params[2];
    const rollNo = params[2];
    const fullName = params[3];
    const phone = params[4];
    const email = params[5];
    const branch = params[6];
    const year = Number(params[7] || 1);
    const semester = Number(params[8] || 1);
    const existing = MOCK_STUDENTS.find(s => s.user_id === userId || s.roll_number === rollNo);
    if (existing) {
      return [{ insertId: existing.id, affectedRows: 1 }];
    }
    const newId = Math.max(...MOCK_STUDENTS.map(s => typeof s.id === 'number' ? s.id : 0), 10) + 1;
    const u = MOCK_USERS.find(usr => usr.id === userId);
    const newStudent = {
      id: newId,
      user_id: userId,
      student_id: studentCode,
      roll_number: rollNo,
      full_name: fullName,
      phone,
      email,
      gender: u ? u.gender : 'FEMALE',
      branch: branch || 'CSE',
      course: 'B.Tech',
      year,
      semester,
      bed_id: null,
      hostel_id: null,
      room_number: null,
      bed_number: null,
      hostel_name: null,
      admission_date: new Date().toISOString(),
      status: 'ACTIVE'
    };
    MOCK_STUDENTS.push(newStudent);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 1c. SELECT COUNT(*) from users
  if (queryLower.includes('from users') && queryLower.includes('count(*)')) {
    const excludeId = params[0] ? Number(params[0]) : null;
    const remainingAdmins = MOCK_USERS.filter(u => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE' && u.id !== excludeId);
    return [[{ cnt: remainingAdmins.length, total: MOCK_USERS.length }]];
  }

  // 1d & 2. SELECT users u JOIN roles r (user lookup by ID, username, or email)
  if (queryLower.includes('from users')) {
    const firstParam = params[0];
    if ((queryLower.includes('where u.id = ?') || queryLower.includes('where id = ?') || (typeof firstParam === 'number' && !isNaN(firstParam)))) {
      const targetId = Number(firstParam);
      const user = MOCK_USERS.find(u => u.id === targetId);
      if (user) {
        const stud = MOCK_STUDENTS.find(s => s.user_id === user.id);
        const r = MOCK_ROLES.find(role => role.id === user.role_id);
        return [[{
          ...user,
          role: user.role || (r ? r.name : 'SUPER_ADMIN'),
          student_record_id: stud ? stud.id : null,
          student_gender: stud ? stud.gender : user.gender
        }]];
      }
    }

    const allIdents = params.map(p => String(p || '').toLowerCase().trim());
    let user = MOCK_USERS.find(u => 
      allIdents.some(p => 
        p === String(u.id) ||
        p === String(u.username || '').toLowerCase() || 
        p === String(u.email || '').toLowerCase() ||
        (p.includes('@') && p.split('@')[0] === String(u.username || '').toLowerCase()) ||
        (u.email.includes('@') && u.email.split('@')[0] === p.split('@')[0])
      )
    );
    if (!user && allIdents.some(p => p.includes('superadmin') || p.includes('admin') || p.includes('ayush'))) {
      user = MOCK_USERS.find(u => u.role === 'SUPER_ADMIN') || MOCK_USERS[0];
    }
    if (user) {
      const stud = MOCK_STUDENTS.find(s => s.user_id === user.id);
      const r = MOCK_ROLES.find(role => role.id === user.role_id);
      return [[{
        ...user,
        role: user.role || (r ? r.name : 'SUPER_ADMIN'),
        student_record_id: stud ? stud.id : null,
        student_gender: stud ? stud.gender : user.gender
      }]];
    }
    return [[]];
  }

  // 3. SELECT superintendent_hostels (assigned hostels check)
  if (queryLower.includes('from superintendent_hostels') && queryLower.includes('user_id = ?')) {
    const userId = params[0];
    const assigned = MOCK_SUPER_HOSTELS.filter(sh => sh.user_id === Number(userId));
    return [assigned];
  }

  // 4. SELECT students belongs check (ownership check)
  if (queryLower.includes('from students') && queryLower.includes('user_id = ? and id = ?')) {
    const userId = params[0];
    const studentId = params[1];
    const student = MOCK_STUDENTS.find(s => s.user_id === Number(userId) && s.id === Number(studentId));
    return student ? [[{ id: student.id }]] : [[]];
  }

  // 5. SELECT student by ID or User ID (profile fetch)
  if (queryLower.includes('from students') && queryLower.includes('user_id = ?')) {
    const userId = params[0];
    const student = MOCK_STUDENTS.find(s => s.user_id === Number(userId));
    if (!student) return [[]];
    const u = MOCK_USERS.find(usr => usr.id === student.user_id);
    const b = student.bed_id ? MOCK_BEDS.find(bed => bed.id === student.bed_id) : null;
    const rm = b ? MOCK_ROOMS.find(r => r.id === b.room_id) : null;
    const fl = rm ? MOCK_FLOORS.find(f => f.id === rm.floor_id) : null;
    const h = rm ? MOCK_HOSTELS.find(hostel => hostel.id === rm.hostel_id) : null;
    return [[{
      ...student,
      user_gender: u ? u.gender : (student.gender || 'Male'),
      gender: u ? u.gender : (student.gender || 'Male'),
      username: u ? u.username : student.student_id,
      user_email: u ? u.email : student.email,
      user_status: u ? u.status : 'ACTIVE',
      bed_number: b ? b.bed_number : null,
      room_number: rm ? rm.room_number : null,
      room_id: rm ? rm.id : null,
      floor_name: fl ? fl.floor_name : null,
      floor_id: fl ? fl.id : null,
      hostel_name: h ? h.name : null,
      hostel_id: h ? h.id : null
    }]];
  }

  if (queryLower.includes('from students') && (queryLower.includes('roll_number = ?') || queryLower.includes('s.roll_number = ?'))) {
    const roll = String(params[0] || '').trim().toLowerCase();
    const email = params[1] ? String(params[1]).trim().toLowerCase() : '';
    const student = MOCK_STUDENTS.find(s => 
      String(s.roll_number || '').trim().toLowerCase() === roll || 
      (email && String(s.email || '').trim().toLowerCase() === email)
    );
    if (!student) return [[]];
    const u = MOCK_USERS.find(usr => usr.id === student.user_id);
    return [[{
      ...student,
      user_gender: u ? u.gender : (student.gender || 'Male'),
      gender: u ? u.gender : (student.gender || 'Male')
    }]];
  }
  
  if (queryLower.includes('from students') && (queryLower.includes('id = ?') || queryLower.includes('s.id = ?')) && !queryLower.includes('from visits') && !queryLower.includes('from meal_attendance') && !queryLower.includes('from rooms r') && !queryLower.includes('from floors f') && !queryLower.includes('from beds b')) {
    const studentId = params[0];
    const student = MOCK_STUDENTS.find(s => s.id === Number(studentId));
    if (!student) return [[]];
    const u = MOCK_USERS.find(usr => usr.id === student.user_id);
    return [[{
      ...student,
      user_gender: u ? u.gender : (student.gender || 'Male'),
      gender: u ? u.gender : (student.gender || 'Male')
    }]];
  }

  if (queryLower.includes('from students') && !queryLower.includes('from visits') && !queryLower.includes('from meal_attendance') && !queryLower.includes('from student_fees') && !queryLower.includes('from student_allocations') && !queryLower.includes('from hostels h') && !queryLower.includes('from rooms r')) {
    let res = MOCK_STUDENTS.map(s => {
      const b = s.bed_id ? MOCK_BEDS.find(bed => bed.id === s.bed_id) : null;
      const rm = b ? MOCK_ROOMS.find(r => r.id === b.room_id) : null;
      const fl = rm ? MOCK_FLOORS.find(f => f.id === rm.floor_id) : null;
      const h = rm ? MOCK_HOSTELS.find(hostel => hostel.id === rm.hostel_id) : null;
      const u = MOCK_USERS.find(user => user.id === s.user_id);
      return {
        ...s,
        username: u ? u.username : s.student_id,
        user_email: u ? u.email : s.email,
        user_status: u ? u.status : 'ACTIVE',
        user_gender: u ? u.gender : (s.gender || 'Male'),
        gender: u ? u.gender : (s.gender || 'Male'),
        bed_number: b ? b.bed_number : null,
        room_number: rm ? rm.room_number : null,
        room_id: rm ? rm.id : null,
        floor_name: fl ? fl.floor_name : null,
        floor_id: fl ? fl.id : null,
        hostel_name: h ? h.name : null,
        hostel_id: h ? h.id : null
      };
    });

    if (queryLower.includes('count(*) as total') || queryLower.includes('count(*)')) {
      return [[{ total: res.length, cnt: res.length }]];
    }

    return [res];
  }

  // 6. SELECT hostels dynamic listings based on role & gender
  if (queryLower.includes('from hostels') && queryLower.includes('superintendent_hostels sh')) {
    // Superintendent query: gets only assigned hostels 1 and 3
    const userId = params[0];
    const assignedIds = MOCK_SUPER_HOSTELS.filter(sh => sh.user_id === Number(userId)).map(sh => sh.hostel_id);
    const assignedHostels = MOCK_HOSTELS.filter(h => assignedIds.includes(h.id));
    return [assignedHostels];
  }

  if (queryLower.includes('from hostels') && queryLower.includes('rooms r') && queryLower.includes('students s')) {
    // Student query: gets only the student's assigned hostel if allocated
    const userId = Number(params[0]);
    const student = MOCK_STUDENTS.find(s => s.user_id === userId);
    if (student && student.bed_id) {
      const b = MOCK_BEDS.find(bed => bed.id === student.bed_id);
      const rm = b ? MOCK_ROOMS.find(r => r.id === b.room_id) : null;
      const hostel = rm ? MOCK_HOSTELS.find(h => h.id === rm.hostel_id) : null;
      return hostel ? [[hostel]] : [[]];
    }
    return [[]];
  }

  if (queryLower.includes('from hostels')) {
    let list = [...MOCK_HOSTELS];
    // Gender filter: check the SQL (case-insensitive) for gender values
    if (queryLower.includes('female') || queryLower.includes('girls')) {
      list = list.filter(h => h.gender === 'FEMALE');
    } else if (/\bmale\b/.test(queryLower) || queryLower.includes('boys')) {
      // 'male' only — don't match 'female'
      list = list.filter(h => h.gender === 'MALE');
    }
    // Determine if this is a dedicated COUNT(*) query (not a rows SELECT with COUNT sub-queries)
    // A dedicated count query starts with SELECT COUNT(*) or SELECT count(*)
    const isCountQuery = /^\s*select\s+count\s*\(\s*\*\s*\)/i.test(sql.trim());
    if (isCountQuery) {
      return [[{ total: list.length }]];
    }
    // Add computed stats fields for each hostel
    const enriched = list.map(h => {
      const hostelBeds = MOCK_BEDS.filter(b => {
        const rm = MOCK_ROOMS.find(r => r.id === b.room_id);
        return rm && rm.hostel_id === h.id;
      });
      const occupiedBeds = hostelBeds.filter(b => MOCK_STUDENTS.some(s => s.bed_id === b.id && s.status === 'ACTIVE'));
      const availableBeds = hostelBeds.filter(b => b.status === 'AVAILABLE' && !MOCK_STUDENTS.some(s => s.bed_id === b.id && s.status === 'ACTIVE'));
      const hostelRooms = MOCK_ROOMS.filter(r => r.hostel_id === h.id);
      const hostelFloors = MOCK_FLOORS.filter(f => f.hostel_id === h.id);
      return {
        ...h,
        total_floors: hostelFloors.length,
        total_rooms: hostelRooms.length,
        total_beds: hostelBeds.length,
        available_beds: availableBeds.length,
        occupied_beds: occupiedBeds.length,
        maintenance_beds: hostelBeds.filter(b => b.status === 'MAINTENANCE').length
      };
    });
    return [enriched];
  }

  // ── MOCK NOTICES OPERATIONS ──────────────────────────────────────────────
  // 7. INSERT INTO notice_reads
  if (queryLower.includes('into notice_reads')) {
    const [notice_id, user_id] = params;
    const existing = MOCK_NOTICE_READS.find(nr => nr.notice_id === Number(notice_id) && nr.user_id === Number(user_id));
    if (!existing) {
      MOCK_NOTICE_READS.push({
        id: MOCK_NOTICE_READS.length + 1,
        notice_id: Number(notice_id),
        user_id: Number(user_id),
        read_at: new Date().toISOString()
      });
    } else {
      existing.read_at = new Date().toISOString();
    }
    return [{ insertId: MOCK_NOTICE_READS.length, affectedRows: 1 }];
  }

  // 8. INSERT INTO notices
  if (queryLower.includes('into notices')) {
    // Params: [title, description, created_by, hostel_id, priority, status, published_at, expires_at]
    const [title, description, created_by, hostel_id, priority, status, published_at, expires_at] = params;
    const creator = MOCK_USERS.find(u => u.id === Number(created_by));
    const hostel = hostel_id ? MOCK_HOSTELS.find(h => h.id === Number(hostel_id)) : null;
    const newNotice = {
      id: MOCK_NOTICES.length + 1,
      title,
      description,
      created_by: Number(created_by),
      creator_name: creator ? creator.username : 'User',
      hostel_id: hostel_id ? Number(hostel_id) : null,
      hostel_name: hostel ? hostel.name : null,
      priority: priority || 'GENERAL',
      status: status || 'DRAFT',
      published_at: published_at || (status === 'PUBLISHED' ? new Date().toISOString() : null),
      expires_at: expires_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_NOTICES.push(newNotice);
    return [{ insertId: newNotice.id, affectedRows: 1 }];
  }

  // 9. UPDATE notices
  if (queryLower.includes('update notices')) {
    if (queryLower.includes('set status =')) {
      // Status update: status, [published_at], id
      const id = params[params.length - 1];
      const notice = MOCK_NOTICES.find(n => n.id === Number(id));
      if (notice) {
        notice.status = params[0];
        if (params.length > 2) notice.published_at = params[1];
        notice.updated_at = new Date().toISOString();
      }
      return [{ affectedRows: notice ? 1 : 0 }];
    }
    // Full update
    const id = params[params.length - 1];
    const notice = MOCK_NOTICES.find(n => n.id === Number(id));
    if (notice) {
      notice.title = params[0];
      notice.description = params[1];
      notice.hostel_id = params[2] ? Number(params[2]) : null;
      notice.priority = params[3];
      notice.status = params[4];
      notice.published_at = params[5];
      notice.expires_at = params[6];
      notice.updated_at = new Date().toISOString();

      const hostel = notice.hostel_id ? MOCK_HOSTELS.find(h => h.id === notice.hostel_id) : null;
      notice.hostel_name = hostel ? hostel.name : null;
    }
    return [{ affectedRows: notice ? 1 : 0 }];
  }

  // 10. DELETE FROM notices
  if (queryLower.includes('delete from notices')) {
    const id = params[0];
    const index = MOCK_NOTICES.findIndex(n => n.id === Number(id));
    if (index !== -1) {
      MOCK_NOTICES.splice(index, 1);
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 11. SELECT FROM notices (single or list or count)
  if (queryLower.includes('from notices')) {
    let result = [...MOCK_NOTICES];

    // Single notice ID query: WHERE n.id = ?
    if (queryLower.includes('where n.id = ?') || queryLower.includes('n.id = ?')) {
      const targetId = Number(params[params.length - 1] || params[1] || params[0]);
      result = result.filter(n => n.id === targetId);
    } else {
      // Status filter
      if (queryLower.includes("n.status = 'published'") || queryLower.includes("n.status = ?")) {
        const reqStatus = queryLower.includes("n.status = ?")
          ? params.find(p => typeof p === 'string' && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(p.toUpperCase()))
          : 'PUBLISHED';
        if (reqStatus) {
          result = result.filter(n => n.status === (reqStatus.toUpperCase ? reqStatus.toUpperCase() : reqStatus));
        } else if (queryLower.includes("n.status = 'published'")) {
          result = result.filter(n => n.status === 'PUBLISHED');
        }
      }

      // Expiration filter: expires_at > NOW()
      if (queryLower.includes('expires_at > now()') || queryLower.includes('n.expires_at > now()')) {
        result = result.filter(n => !n.expires_at || new Date(n.expires_at) > new Date());
      }

      // Read filter: nr.id IS NULL (unread)
      if (queryLower.includes('nr.id is null')) {
        const userId = Number(params[0]);
        result = result.filter(n => !MOCK_NOTICE_READS.some(nr => nr.notice_id === n.id && nr.user_id === userId));
      }

      // Hostel filter for student / superintendent
      if (queryLower.includes('n.hostel_id is null or n.hostel_id = ?')) {
        const hostelId = params.find(p => typeof p === 'number');
        if (hostelId !== undefined) {
          result = result.filter(n => n.hostel_id === null || n.hostel_id === Number(hostelId));
        }
      } else if (queryLower.includes('n.hostel_id is null')) {
        result = result.filter(n => n.hostel_id === null);
      }
    }

    // Enrich with is_read and creator_name
    const userId = Number(params[0] || 0);
    result = result.map(n => {
      const hostel = n.hostel_id ? MOCK_HOSTELS.find(h => h.id === n.hostel_id) : null;
      const creator = MOCK_USERS.find(u => u.id === n.created_by);
      const isRead = MOCK_NOTICE_READS.some(nr => nr.notice_id === n.id && nr.user_id === userId);
      return {
        ...n,
        hostel_name: hostel ? hostel.name : null,
        creator_name: creator ? creator.username : 'Admin',
        is_read: isRead ? 1 : 0
      };
    });

    if (queryLower.includes('count(')) {
      return [[{ total: result.length, count: result.length, unreadCount: result.length }]];
    }

    return [result];
  }

  // ── MOCK COMPLAINTS OPERATIONS ───────────────────────────────────────────
  // 12. INSERT INTO complaints
  if (queryLower.includes('into complaints')) {
    const [student_id, hostel_id, category, priority, title, description] = params;
    const newComp = {
      id: MOCK_COMPLAINTS.length + 1,
      student_id: Number(student_id),
      hostel_id: Number(hostel_id),
      category: category || 'ROOM',
      priority: priority || 'MEDIUM',
      title,
      description,
      status: 'OPEN',
      assigned_to: null,
      resolution: null,
      resolved_at: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_COMPLAINTS.push(newComp);
    return [{ insertId: newComp.id, affectedRows: 1 }];
  }

  // 13. INSERT INTO complaint_history
  if (queryLower.includes('into complaint_history')) {
    const [complaint_id, changed_by, old_status, new_status, comment] = params;
    const newHist = {
      id: MOCK_COMPLAINT_HISTORY.length + 1,
      complaint_id: Number(complaint_id),
      changed_by: Number(changed_by),
      old_status: old_status || null,
      new_status: new_status || null,
      comment: comment || null,
      created_at: new Date().toISOString()
    };
    MOCK_COMPLAINT_HISTORY.push(newHist);
    return [{ insertId: newHist.id, affectedRows: 1 }];
  }

  // 14. INSERT INTO complaint_comments
  if (queryLower.includes('into complaint_comments')) {
    const [complaint_id, user_id, comment, is_internal] = params;
    const newComm = {
      id: MOCK_COMPLAINT_COMMENTS.length + 1,
      complaint_id: Number(complaint_id),
      user_id: Number(user_id),
      comment,
      is_internal: is_internal ? 1 : 0,
      created_at: new Date().toISOString()
    };
    MOCK_COMPLAINT_COMMENTS.push(newComm);
    return [{ insertId: newComm.id, affectedRows: 1 }];
  }

  // 15. UPDATE complaints
  if (queryLower.includes('update complaints')) {
    if (queryLower.includes('set assigned_to =')) {
      const assignedTo = params[0];
      const id = params[1];
      const comp = MOCK_COMPLAINTS.find(c => c.id === Number(id));
      if (comp) {
        comp.assigned_to = assignedTo ? Number(assignedTo) : null;
        if (comp.status === 'OPEN') comp.status = 'IN_PROGRESS';
        comp.updated_at = new Date().toISOString();
      }
      return [{ affectedRows: comp ? 1 : 0 }];
    }

    if (queryLower.includes('set status =')) {
      const targetStatus = params[0];
      let id = params[params.length - 1];
      const comp = MOCK_COMPLAINTS.find(c => c.id === Number(id));
      if (comp) {
        comp.status = targetStatus;
        if (targetStatus === 'RESOLVED') {
          comp.resolution = params[1];
          comp.resolved_at = new Date().toISOString();
        } else if (targetStatus === 'CLOSED') {
          comp.closed_at = new Date().toISOString();
        }
        comp.updated_at = new Date().toISOString();
      }
      return [{ affectedRows: comp ? 1 : 0 }];
    }
  }

  // 16. SELECT FROM complaint_history
  if (queryLower.includes('from complaint_history')) {
    const complaintId = Number(params[0]);
    const history = MOCK_COMPLAINT_HISTORY
      .filter(ch => ch.complaint_id === complaintId)
      .map(ch => {
        const u = MOCK_USERS.find(user => user.id === ch.changed_by);
        return {
          ...ch,
          changed_by_name: u ? u.username : 'User',
          changed_by_role: u ? u.role : 'USER'
        };
      });
    return [history];
  }

  // 17. SELECT FROM complaint_comments
  if (queryLower.includes('from complaint_comments')) {
    const complaintId = Number(params[0]);
    let comments = MOCK_COMPLAINT_COMMENTS.filter(cc => cc.complaint_id === complaintId);
    if (queryLower.includes('cc.is_internal = 0')) {
      comments = comments.filter(cc => cc.is_internal === 0);
    }
    comments = comments.map(cc => {
      const u = MOCK_USERS.find(user => user.id === cc.user_id);
      return {
        ...cc,
        author_name: u ? u.username : 'User',
        author_role: u ? u.role : 'USER'
      };
    });
    return [comments];
  }

  if (queryLower.includes('show columns from complaints')) {
    return [[{ Field: 'category', Type: "enum('ROOM','ELECTRICITY','WATER','PLUMBING','CLEANLINESS','FAN_AC','FURNITURE','FOOD_MESS','INTERNET','SECURITY','MAINTENANCE','OTHER')" }]];
  }

  // 18. SELECT FROM complaints (summary / count / list)
  if (queryLower.includes('from complaints')) {
    let result = [...MOCK_COMPLAINTS];

    // Check summary aggregation query
    if (queryLower.includes('sum(status =')) {
      const studentIdFilter = params[0];
      if (queryLower.includes('where student_id = ?')) {
        result = result.filter(c => c.student_id === Number(studentIdFilter));
      } else if (queryLower.includes('where hostel_id in')) {
        const hostelIds = params.map(p => Number(p));
        result = result.filter(c => hostelIds.includes(c.hostel_id));
      }
      const openCount = result.filter(c => c.status === 'OPEN').length;
      const inProgressCount = result.filter(c => c.status === 'IN_PROGRESS').length;
      const resolvedCount = result.filter(c => c.status === 'RESOLVED').length;
      const urgentCount = result.filter(c => c.priority === 'URGENT' && ['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(c.status)).length;
      return [[{
        openCount,
        inProgressCount,
        resolvedCount,
        urgentCount,
        totalCount: result.length
      }]];
    }

    // Filter by student_id
    if (queryLower.includes('c.student_id = ?') || queryLower.includes('student_id = ?')) {
      const sId = params.find(p => typeof p === 'number');
      if (sId !== undefined) {
        result = result.filter(c => c.student_id === Number(sId));
      }
    }

    // Filter by hostel_id IN (...)
    if (queryLower.includes('c.hostel_id in')) {
      const hostelIds = params.filter(p => typeof p === 'number');
      if (hostelIds.length > 0) {
        result = result.filter(c => hostelIds.includes(c.hostel_id));
      }
    }

    // Filter by status
    if (queryLower.includes('c.status = ?')) {
      const st = params.find(p => typeof p === 'string' && VALID_STATUSES.includes(p.toUpperCase()));
      if (st) {
        result = result.filter(c => c.status === st.toUpperCase());
      }
    }

    // Filter by category
    if (queryLower.includes('c.category = ?')) {
      const cat = params.find(p => typeof p === 'string' && VALID_CATEGORIES.includes(p.toUpperCase()));
      if (cat) {
        result = result.filter(c => c.category === cat.toUpperCase());
      }
    }

    // Filter by priority
    if (queryLower.includes('c.priority = ?')) {
      const prio = params.find(p => typeof p === 'string' && VALID_PRIORITIES.includes(p.toUpperCase()));
      if (prio) {
        result = result.filter(c => c.priority === prio.toUpperCase());
      }
    }

    // Single complaint query: WHERE c.id = ?
    if (queryLower.includes('c.id = ?')) {
      const compId = Number(params[0]);
      result = result.filter(c => c.id === compId);
    }

    if (queryLower.includes('count(')) {
      return [[{ total: result.length, count: result.length }]];
    }

    // Map fields
    result = result.map(c => {
      const st = MOCK_STUDENTS.find(s => s.id === c.student_id) || MOCK_STUDENTS[0];
      const h = MOCK_HOSTELS.find(hostel => hostel.id === c.hostel_id) || MOCK_HOSTELS[0];
      const u = c.assigned_to ? MOCK_USERS.find(user => user.id === c.assigned_to) : null;
      return {
        ...c,
        student_name: st ? st.full_name : 'John Doe',
        student_code: st ? st.student_id : 'STD2026001',
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        room_number: st ? st.room_number : '101',
        bed_number: st ? st.bed_number : 'A-1',
        assigned_to_name: u ? u.username : null
      };
    });

    return [result];
  }

  // 19. INSERT INTO visits
  if (queryLower.includes('insert into visits')) {
    const newId = MOCK_VISITS.length + 1;
    const newVisit = {
      id: newId,
      student_id: Number(params[0]),
      hostel_id: Number(params[1]),
      room_id: params[2] ? Number(params[2]) : null,
      bed_id: params[3] ? Number(params[3]) : null,
      visitor_name: params[4],
      visitor_phone: params[5],
      visitor_email: params[6] || null,
      visitor_type: params[7],
      purpose: params[8],
      identification_type: params[9] || 'Aadhaar',
      identification_last4: params[10],
      visit_date: params[11],
      expected_check_in: params[12],
      expected_check_out: params[13],
      actual_check_in: null,
      actual_check_out: null,
      status: params[14] || 'REQUESTED',
      created_by: Number(params[15]),
      approved_by: params[16] ? Number(params[16]) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_VISITS.push(newVisit);
    return [{ insertId: newId }];
  }

  // 20. INSERT INTO visitor_history
  if (queryLower.includes('insert into visitor_history')) {
    const newId = MOCK_VISITOR_HISTORY.length + 1;
    MOCK_VISITOR_HISTORY.push({
      id: newId,
      visit_id: Number(params[0]),
      changed_by: Number(params[1]),
      old_status: params[2] || null,
      new_status: params[3],
      comment: params[4] || null,
      created_at: new Date().toISOString()
    });
    return [{ insertId: newId }];
  }

  // 21. UPDATE visits
  if (queryLower.includes('update visits')) {
    let visitId;
    if (queryLower.includes('where id = ?')) {
      visitId = Number(params[params.length - 1]);
    }
    const visit = MOCK_VISITS.find(v => v.id === visitId);
    if (visit) {
      if (queryLower.includes("status = 'approved'")) {
        visit.status = 'APPROVED';
        if (queryLower.includes('approved_by = ?')) {
          visit.approved_by = Number(params[0]);
        }
      } else if (queryLower.includes("status = 'rejected'")) {
        visit.status = 'REJECTED';
      } else if (queryLower.includes("status = 'cancelled'")) {
        visit.status = 'CANCELLED';
      } else if (queryLower.includes("status = 'checked_in'")) {
        visit.status = 'CHECKED_IN';
        visit.actual_check_in = new Date().toISOString();
      } else if (queryLower.includes("status = 'checked_out'")) {
        visit.status = 'CHECKED_OUT';
        visit.actual_check_out = new Date().toISOString();
      }
      visit.updated_at = new Date().toISOString();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 22. SELECT FROM visitor_history
  if (queryLower.includes('from visitor_history')) {
    const visitId = Number(params[0]);
    const history = MOCK_VISITOR_HISTORY
      .filter(vh => vh.visit_id === visitId)
      .map(vh => {
        const u = MOCK_USERS.find(user => user.id === vh.changed_by);
        return {
          ...vh,
          changed_by_name: u ? u.username : 'User',
          changed_by_role: u ? u.role : 'USER'
        };
      });
    return [history];
  }

  // 23. SELECT FROM visits v
  if (queryLower.includes('from visits v') || queryLower.includes('from visits')) {
    let result = [...MOCK_VISITS];
    // console.log('DEBUG MOCK VISITS COUNT:', MOCK_VISITS.length, 'params:', params);

    // Summary counts query
    if (queryLower.includes('sum(case when v.status')) {
      if (queryLower.includes('where v.student_id = ?')) {
        result = result.filter(v => v.student_id === Number(params[0]));
      } else if (queryLower.includes('where v.hostel_id in')) {
        const hostelIds = params.map(p => Number(p));
        result = result.filter(v => hostelIds.includes(v.hostel_id));
      }

      const current_visitors = result.filter(v => v.status === 'CHECKED_IN').length;
      const overdue_visitors = result.filter(v => v.status === 'CHECKED_IN' && new Date(v.expected_check_out) < new Date()).length;
      const today_visits = result.filter(v => v.visit_date === new Date().toISOString().split('T')[0]).length;
      const pending_requests = result.filter(v => v.status === 'REQUESTED').length;

      return [[{
        current_visitors,
        overdue_visitors,
        today_visits,
        pending_requests,
        total_visits: result.length
      }]];
    }

    // Filter by student_id
    if (queryLower.includes('where v.student_id = ?') || queryLower.includes('and v.student_id = ?')) {
      const sId = params.find(p => typeof p === 'number');
      if (sId !== undefined) {
        result = result.filter(v => v.student_id === Number(sId));
      }
    }

    // Filter by hostel_id IN (...)
    if (queryLower.includes('v.hostel_id in')) {
      const hostelIds = params.filter(p => typeof p === 'number');
      if (hostelIds.length > 0) {
        result = result.filter(v => hostelIds.includes(v.hostel_id));
      }
    } else if (queryLower.includes('where v.hostel_id = ?') || queryLower.includes('and v.hostel_id = ?')) {
      const hId = params.find(p => typeof p === 'number');
      if (hId !== undefined) {
        result = result.filter(v => v.hostel_id === Number(hId));
      }
    }

    // Filter by status
    if (queryLower.includes('where v.status = ?') || queryLower.includes('and v.status = ?')) {
      const st = params.find(p => typeof p === 'string' && ['REQUESTED', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED'].includes(p.toUpperCase()));
      if (st) {
        result = result.filter(v => v.status === st.toUpperCase());
      }
    }

    // Filter by is_current
    if (queryLower.includes("where v.status = 'checked_in'") || queryLower.includes("and v.status = 'checked_in'")) {
      result = result.filter(v => v.status === 'CHECKED_IN');
    }

    // Filter by single visit ID
    if (queryLower.includes('where v.id = ?')) {
      const vId = Number(params[params.length - 1]);
      result = result.filter(v => v.id === vId);
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: result.length }]];
    }

    result = result.map(v => {
      const st = MOCK_STUDENTS.find(s => s.id === v.student_id) || MOCK_STUDENTS[0];
      const h = MOCK_HOSTELS.find(hostel => hostel.id === v.hostel_id) || MOCK_HOSTELS[0];
      const cb = MOCK_USERS.find(user => user.id === v.created_by);
      const ab = v.approved_by ? MOCK_USERS.find(user => user.id === v.approved_by) : null;

      return {
        ...v,
        student_name: st ? st.full_name : 'John Doe',
        student_code: st ? st.student_id : 'STD2026001',
        student_phone: st ? st.phone : '9876543210',
        student_branch: st ? st.branch : 'CSE',
        student_year: st ? st.year : 3,
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        room_number: st ? st.room_number : '101',
        bed_number: st ? st.bed_number : 'A-1',
        creator_name: cb ? cb.username : 'User',
        creator_role: cb ? cb.role : 'STUDENT',
        approver_name: ab ? ab.username : null,
        is_overdue: (v.status === 'CHECKED_IN' && new Date(v.expected_check_out) < new Date()) ? 1 : 0
      };
    });

    return [result];
  }

  // --- MESS MENUS QUERIES ---
  if (queryLower.includes('insert into mess_menus')) {
    const newId = MOCK_MESS_MENUS.length > 0 ? Math.max(...MOCK_MESS_MENUS.map(m => m.id)) + 1 : 1;
    const newItem = {
      id: newId,
      hostel_id: params[0] !== undefined ? params[0] : null,
      menu_date: params[1],
      meal_type: params[2],
      meal_name: params[3],
      description: params[4] || null,
      is_available: params[5] !== undefined ? params[5] : 1,
      created_by: params[6] || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_MESS_MENUS.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update mess_menus')) {
    const id = params[params.length - 1];
    const item = MOCK_MESS_MENUS.find(m => m.id === Number(id));
    if (item) {
      if (params[0] !== null && params[0] !== undefined) item.meal_name = params[0];
      if (params[1] !== null && params[1] !== undefined) item.description = params[1];
      if (params[2] !== null && params[2] !== undefined) item.is_available = params[2];
      item.updated_at = new Date().toISOString();
    }
    return [{ affectedRows: item ? 1 : 0 }];
  }

  if (queryLower.includes('delete from mess_menus')) {
    const id = Number(params[0]);
    const initialLen = MOCK_MESS_MENUS.length;
    MOCK_MESS_MENUS = MOCK_MESS_MENUS.filter(m => m.id !== id);
    return [{ affectedRows: initialLen - MOCK_MESS_MENUS.length }];
  }

  if (queryLower.includes("show columns from complaints like 'category'")) {
    return [[{ Field: 'category', Type: "enum('ROOM','ELECTRICITY','WATER','PLUMBING','CLEANLINESS','FAN_AC','FURNITURE','FOOD_MESS','INTERNET','SECURITY','MAINTENANCE','OTHER')" }]];
  }

  if (queryLower.includes('from mess_menus')) {
    let result = [...MOCK_MESS_MENUS];

    if (queryLower.includes('m.id = ?') || queryLower.includes('where id = ?') || queryLower.includes('where m.id = ?')) {
      const id = Number(params[params.length - 1]);
      result = result.filter(m => m.id === id);
    }

    if (queryLower.includes('hostel_id = ?')) {
      const hId = params.find(p => typeof p === 'number' || p === null);
      if (hId !== undefined && hId !== null) {
        result = result.filter(m => m.hostel_id === Number(hId) || m.hostel_id === null);
      }
    }

    if (queryLower.includes('menu_date = ?') || queryLower.includes('m.menu_date = ?')) {
      const d = params.find(p => typeof p === 'string' && p.match(/^\d{4}-\d{2}-\d{2}$/));
      if (d) result = result.filter(m => m.menu_date === d);
    }

    if (queryLower.includes('meal_type = ?') || queryLower.includes('m.meal_type = ?')) {
      const mt = params.find(p => typeof p === 'string' && ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].includes(p.toUpperCase()));
      if (mt) result = result.filter(m => m.meal_type === mt.toUpperCase());
    }

    result = result.map(m => {
      const h = MOCK_HOSTELS.find(hostel => hostel.id === m.hostel_id);
      const u = MOCK_USERS.find(user => user.id === m.created_by);
      return {
        ...m,
        hostel_name: h ? h.name : (m.hostel_id === null ? 'All Hostels (Common)' : 'Hostel 1'),
        creator_name: u ? u.full_name : 'Admin'
      };
    });

    return [result];
  }

  // --- MEAL ATTENDANCE QUERIES ---
  if (queryLower.includes('insert into meal_attendance')) {
    const studentId = Number(params[0]);
    const hostelId = Number(params[1]);
    const mealDate = params[2];
    const mealType = params[3];
    const status = params[4];

    const idx = MOCK_MEAL_ATTENDANCE.findIndex(ma => ma.student_id === studentId && ma.meal_date === mealDate && ma.meal_type === mealType);
    if (idx >= 0) {
      MOCK_MEAL_ATTENDANCE[idx].status = status;
      MOCK_MEAL_ATTENDANCE[idx].marked_at = new Date().toISOString();
      return [{ insertId: MOCK_MEAL_ATTENDANCE[idx].id, affectedRows: 1 }];
    } else {
      const newId = MOCK_MEAL_ATTENDANCE.length > 0 ? Math.max(...MOCK_MEAL_ATTENDANCE.map(ma => ma.id)) + 1 : 1;
      MOCK_MEAL_ATTENDANCE.push({
        id: newId,
        student_id: studentId,
        hostel_id: hostelId,
        meal_date: mealDate,
        meal_type: mealType,
        status: status,
        marked_at: new Date().toISOString()
      });
      return [{ insertId: newId, affectedRows: 1 }];
    }
  }

  if (queryLower.includes('from meal_attendance')) {
    let result = [...MOCK_MEAL_ATTENDANCE];

    if (queryLower.includes('ma.student_id = ?')) {
      const sId = Number(params[0]);
      result = result.filter(ma => ma.student_id === sId);
    }

    if (queryLower.includes('ma.hostel_id = ?')) {
      const hId = Number(params[0]);
      result = result.filter(ma => ma.hostel_id === hId);
    }

    if (queryLower.includes('ma.meal_date = ?') || queryLower.includes('meal_date = ?')) {
      const d = params.find(p => typeof p === 'string' && p.match(/^\d{4}-\d{2}-\d{2}$/));
      if (d) result = result.filter(ma => ma.meal_date === d);
    }

    if (queryLower.includes('ma.meal_type = ?') || queryLower.includes('meal_type = ?')) {
      const mt = params.find(p => typeof p === 'string' && ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].includes(p.toUpperCase()));
      if (mt) result = result.filter(ma => ma.meal_type === mt.toUpperCase());
    }

    if (queryLower.includes('ma.status = ?')) {
      const st = params.find(p => typeof p === 'string' && ['TAKING', 'NOT_TAKING'].includes(p.toUpperCase()));
      if (st) result = result.filter(ma => ma.status === st.toUpperCase());
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: result.length }]];
    }

    if (queryLower.includes('group by meal_type, status')) {
      const grouped = [];
      const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
      mealTypes.forEach(mt => {
        ['TAKING', 'NOT_TAKING'].forEach(st => {
          const count = result.filter(r => r.meal_type === mt && r.status === st).length;
          if (count > 0) {
            grouped.push({ meal_type: mt, status: st, count });
          }
        });
      });
      return [grouped];
    }

    result = result.map(ma => {
      const st = MOCK_STUDENTS.find(s => s.id === ma.student_id) || MOCK_STUDENTS[0];
      const menu = MOCK_MESS_MENUS.find(m => (m.hostel_id === ma.hostel_id || m.hostel_id === null) && m.menu_date === ma.meal_date && m.meal_type === ma.meal_type);
      return {
        ...ma,
        student_name: st ? st.full_name : 'John Doe',
        student_code: st ? st.student_id : 'STD2026001',
        room_number: st ? st.room_number : '101',
        meal_name: menu ? menu.meal_name : 'Standard Meal',
        menu_description: menu ? menu.description : ''
      };
    });

    return [result];
  }

  // ==========================================
  // PHASE 11: HOSTEL FEES & PAYMENT MANAGEMENT
  // ==========================================

  // 1. fee_structures queries
  if (queryLower.includes('into fee_structures')) {
    const newId = MOCK_FEE_STRUCTURES.length > 0 ? Math.max(...MOCK_FEE_STRUCTURES.map(f => f.id)) + 1 : 1;
    const newItem = {
      id: newId,
      hostel_id: params[0],
      fee_type: params[1],
      name: params[2],
      description: params[3],
      amount: parseFloat(params[4]),
      frequency: params[5],
      academic_year: params[6],
      applicable_course: params[7],
      applicable_branch: params[8],
      applicable_year: params[9],
      is_active: 1,
      created_by: params[10],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_FEE_STRUCTURES.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update fee_structures')) {
    const idParam = params[params.length - 1];
    const fsItem = MOCK_FEE_STRUCTURES.find(f => f.id === Number(idParam));
    if (fsItem) {
      if (queryLower.includes('is_active = ?')) {
        const val = params.find(p => p === 0 || p === 1 || p === true || p === false);
        fsItem.is_active = val ? 1 : 0;
      }
      fsItem.updated_at = new Date().toISOString();
    }
    return [{ affectedRows: fsItem ? 1 : 0 }];
  }

  if (queryLower.includes('from fee_structures')) {
    let result = MOCK_FEE_STRUCTURES.map(fs => {
      const h = MOCK_HOSTELS.find(h => h.id === fs.hostel_id);
      const u = MOCK_USERS.find(u => u.id === fs.created_by);
      return {
        ...fs,
        hostel_name: h ? h.name : (fs.hostel_id === null ? 'All Hostels (Global)' : 'Hostel'),
        creator_name: u ? u.full_name : 'Admin'
      };
    });

    if (queryLower.includes('fs.id = ?') || queryLower.includes('where fs.id = ?')) {
      const targetId = Number(params[0]);
      return [[result.find(f => f.id === targetId)].filter(Boolean)];
    }

    if (queryLower.includes('fs.fee_type = ?')) {
      const ft = params.find(p => typeof p === 'string' && ['HOSTEL_FEE', 'MESS_FEE', 'MAINTENANCE_FEE', 'SECURITY_DEPOSIT', 'OTHER'].includes(p));
      if (ft) result = result.filter(f => f.fee_type === ft);
    }

    if (queryLower.includes('fs.academic_year = ?')) {
      const ay = params.find(p => typeof p === 'string' && p.match(/^\d{4}-\d{2,4}$/));
      if (ay) result = result.filter(f => f.academic_year === ay);
    }

    if (queryLower.includes('fs.is_active = ?')) {
      const ia = params.find(p => typeof p === 'number');
      if (ia !== undefined) result = result.filter(f => f.is_active === ia);
    }

    return [result];
  }

  // 2. student_fees queries
  if (queryLower.includes('into student_fees')) {
    const newId = MOCK_STUDENT_FEES.length > 0 ? Math.max(...MOCK_STUDENT_FEES.map(f => f.id)) + 1 : 1;
    const newItem = {
      id: newId,
      student_id: params[0],
      hostel_id: params[1],
      fee_structure_id: params[2],
      academic_year: params[3],
      amount: parseFloat(params[4]),
      paid_amount: 0.00,
      due_date: params[5],
      status: params[6] || 'PENDING',
      waiver_reason: null,
      waived_by: null,
      waived_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_STUDENT_FEES.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update student_fees')) {
    const idParam = params[params.length - 1];
    const sfItem = MOCK_STUDENT_FEES.find(sf => sf.id === Number(idParam));
    if (sfItem) {
      if (queryLower.includes('paid_amount = ?')) {
        sfItem.paid_amount = parseFloat(params[0]);
        if (queryLower.includes('status = ?')) sfItem.status = params[1];
      } else if (queryLower.includes("status = 'waived'")) {
        sfItem.status = 'WAIVED';
        sfItem.waiver_reason = params[0];
        sfItem.waived_by = params[1];
        sfItem.waived_at = new Date().toISOString();
      }
      sfItem.updated_at = new Date().toISOString();
    }
    return [{ affectedRows: sfItem ? 1 : 0 }];
  }

  if (queryLower.includes('from student_fees')) {
    // Summary aggregation queries
    if (queryLower.includes('sum(sf.amount) as total_assigned') || queryLower.includes('sum(amount) as total_fees')) {
      let filtered = [...MOCK_STUDENT_FEES];
      if (queryLower.includes('sf.hostel_id = ?')) {
        const hId = Number(params[0]);
        filtered = filtered.filter(f => f.hostel_id === hId);
      }
      if (queryLower.includes('student_id = ?')) {
        const sId = Number(params[0]);
        filtered = filtered.filter(f => f.student_id === sId);
      }
      const activeFees = filtered.filter(f => f.status !== 'WAIVED');
      const totalAssigned = activeFees.reduce((acc, f) => acc + parseFloat(f.amount), 0);
      const totalCollected = activeFees.reduce((acc, f) => acc + parseFloat(f.paid_amount), 0);
      const totalPending = Math.max(0, totalAssigned - totalCollected);
      return [[{ total_assigned: totalAssigned, total_fees: totalAssigned, total_collected: totalCollected, total_paid: totalCollected, total_pending: totalPending }]];
    }

    if (queryLower.includes('sum(sf.amount - sf.paid_amount) as total_overdue') || queryLower.includes('sum(amount - paid_amount) as total_overdue')) {
      const todayStr = new Date().toISOString().split('T')[0];
      let filtered = MOCK_STUDENT_FEES.filter(f => f.status !== 'WAIVED' && f.status !== 'PAID' && f.due_date < todayStr);
      if (queryLower.includes('sf.hostel_id = ?')) {
        const hId = Number(params[params.length - 1]);
        filtered = filtered.filter(f => f.hostel_id === hId);
      }
      if (queryLower.includes('student_id = ?')) {
        const sId = Number(params[0]);
        filtered = filtered.filter(f => f.student_id === sId);
      }
      const overdueSum = filtered.reduce((acc, f) => acc + (parseFloat(f.amount) - parseFloat(f.paid_amount)), 0);
      return [[{ total_overdue: Math.max(0, overdueSum) }]];
    }

    let result = MOCK_STUDENT_FEES.map(sf => {
      const st = MOCK_STUDENTS.find(s => s.id === sf.student_id) || MOCK_STUDENTS[0];
      const h = MOCK_HOSTELS.find(h => h.id === sf.hostel_id) || MOCK_HOSTELS[0];
      const fs = MOCK_FEE_STRUCTURES.find(f => f.id === sf.fee_structure_id);
      const wb = MOCK_USERS.find(u => u.id === sf.waived_by);
      return {
        ...sf,
        remaining_amount: Math.max(0, parseFloat(sf.amount) - parseFloat(sf.paid_amount)),
        student_name: st ? st.full_name : 'John Doe',
        student_code: st ? st.student_id : 'STD2026001',
        room_number: st ? st.room_number : '101',
        branch: st ? st.branch : 'CSE',
        course: st ? st.course : 'B.Tech',
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        fee_name: fs ? fs.name : 'Hostel Fee',
        fee_type: fs ? fs.fee_type : 'HOSTEL_FEE',
        frequency: fs ? fs.frequency : 'YEARLY',
        waived_by_name: wb ? wb.full_name : null
      };
    });

    if (queryLower.includes('sf.id = ?') || (queryLower.includes('where sf.id = ?') || (queryLower.includes('where id = ?')))) {
      const targetId = Number(params[0]);
      const found = result.find(sf => sf.id === targetId);
      return [[found].filter(Boolean)];
    }

    if (queryLower.includes('where sf.student_id = ?') || queryLower.includes('where student_id = ?')) {
      const sId = Number(params[0]);
      result = result.filter(sf => sf.student_id === sId);
    }

    if (queryLower.includes('fee_structure_id = ?')) {
      const fsId = Number(params[1] !== undefined ? params[1] : params[0]);
      result = result.filter(sf => sf.fee_structure_id === fsId);
    }

    if (queryLower.includes('academic_year = ?')) {
      const ay = params.find(p => typeof p === 'string' && p.match(/^\d{4}-\d{2,4}$/));
      if (ay) result = result.filter(sf => sf.academic_year === ay);
    }

    if (queryLower.includes('id = ?') && !queryLower.includes('student_id') && !queryLower.includes('hostel_id') && !queryLower.includes('fee_structure_id')) {
      const targetId = Number(params[0]);
      return [[result.find(sf => sf.id === targetId)].filter(Boolean)];
    }

    if (queryLower.includes('hostel_id = ?')) {
      const hId = Number(params[params.length - 1]);
      result = result.filter(sf => sf.hostel_id === hId);
    }

    if (queryLower.includes('status = ?')) {
      const st = params.find(p => typeof p === 'string' && ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'].includes(p));
      if (st) result = result.filter(sf => sf.status === st);
    }

    if (queryLower.includes('status != "waived"') || queryLower.includes("status != 'waived'")) {
      result = result.filter(sf => sf.status !== 'WAIVED');
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: result.length }]];
    }

    return [result];
  }

  // 3. fee_payments queries
  if (queryLower.includes('into fee_payments')) {
    const newId = MOCK_FEE_PAYMENTS.length > 0 ? Math.max(...MOCK_FEE_PAYMENTS.map(p => p.id)) + 1 : 1;
    const newItem = {
      id: newId,
      student_fee_id: params[0],
      student_id: params[1],
      hostel_id: params[2],
      amount: parseFloat(params[3]),
      payment_method: params[4],
      receipt_number: params[5],
      transaction_reference: params[6],
      payment_date: params[7],
      received_by: params[8],
      notes: params[9],
      created_at: new Date().toISOString()
    };
    MOCK_FEE_PAYMENTS.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('from fee_payments')) {
    let result = MOCK_FEE_PAYMENTS.map(fp => {
      const st = MOCK_STUDENTS.find(s => s.id === fp.student_id) || MOCK_STUDENTS[0];
      const h = MOCK_HOSTELS.find(h => h.id === fp.hostel_id) || MOCK_HOSTELS[0];
      const sf = MOCK_STUDENT_FEES.find(s => s.id === fp.student_fee_id);
      const fs = sf ? MOCK_FEE_STRUCTURES.find(f => f.id === sf.fee_structure_id) : null;
      const u = MOCK_USERS.find(u => u.id === fp.received_by);
      return {
        ...fp,
        student_name: st ? st.full_name : 'John Doe',
        student_code: st ? st.student_id : 'STD2026001',
        room_number: st ? st.room_number : '101',
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        academic_year: sf ? sf.academic_year : '2026-27',
        total_fee_amount: sf ? parseFloat(sf.amount) : 30000.00,
        current_total_paid: sf ? parseFloat(sf.paid_amount) : 10000.00,
        fee_name: fs ? fs.name : 'Hostel Fee',
        fee_type: fs ? fs.fee_type : 'HOSTEL_FEE',
        received_by_name: u ? u.full_name : 'Warden / Staff'
      };
    });

    if (queryLower.includes('fp.id = ?') || queryLower.includes('where fp.id = ?')) {
      const targetId = Number(params[0]);
      return [[result.find(p => p.id === targetId)].filter(Boolean)];
    }

    if (queryLower.includes('fp.student_fee_id = ?')) {
      const sfId = Number(params[0]);
      result = result.filter(p => p.student_fee_id === sfId);
    }

    if (queryLower.includes('transaction_reference = ?')) {
      const ref = params[0];
      result = result.filter(p => p.transaction_reference === ref);
    }

    if (queryLower.includes('count(*) as cnt') || queryLower.includes('count(*) as total')) {
      return [[{ cnt: result.length, total: result.length }]];
    }

    return [result];
  }

  // 4. fee_history queries
  if (queryLower.includes('into fee_history')) {
    const newId = MOCK_FEE_HISTORY.length > 0 ? Math.max(...MOCK_FEE_HISTORY.map(h => h.id)) + 1 : 1;
    const newItem = {
      id: newId,
      student_fee_id: params[0],
      changed_by: params[1],
      action: params[2],
      old_value: params[3],
      new_value: params[4],
      reason: params[5],
      created_at: new Date().toISOString()
    };
    MOCK_FEE_HISTORY.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('from fee_history')) {
    let result = MOCK_FEE_HISTORY.map(fh => {
      const u = MOCK_USERS.find(u => u.id === fh.changed_by);
      return {
        ...fh,
        changed_by_name: u ? u.full_name : 'System Admin'
      };
    });

    if (queryLower.includes('fh.student_fee_id = ?') || queryLower.includes('student_fee_id = ?')) {
      const sfId = Number(params[0]);
      result = result.filter(h => h.student_fee_id === sfId);
    }

    return [result];
  }

  // student_allocations mock handling
  if (queryLower.includes('into student_allocations')) {
    const newId = MOCK_STUDENT_ALLOCATIONS.length > 0 ? Math.max(...MOCK_STUDENT_ALLOCATIONS.map(a => a.id)) + 1 : 1;
    const newItem = {
      id: newId,
      student_id: Number(params[0]),
      hostel_id: Number(params[1]),
      room_id: Number(params[2]),
      bed_id: Number(params[3]),
      allocated_from: params[4],
      allocated_until: null,
      status: 'ACTIVE',
      allocated_by: Number(params[5]),
      checkout_reason: null,
      transfer_reason: params[6] || null,
      custom_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_STUDENT_ALLOCATIONS.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update student_allocations')) {
    if (queryLower.includes('status = \'transferred\'') || queryLower.includes('status = \'checked_out\'')) {
      const allocId = Number(params[params.length - 1]);
      const alloc = MOCK_STUDENT_ALLOCATIONS.find(a => a.id === allocId);
      if (alloc) {
        if (queryLower.includes('status = \'transferred\'')) {
          alloc.status = 'TRANSFERRED';
          alloc.allocated_until = params[0];
          alloc.transfer_reason = params[1];
        } else {
          alloc.status = 'CHECKED_OUT';
          alloc.allocated_until = params[0];
          alloc.checkout_reason = params[1];
          alloc.custom_reason = params[2];
        }
      }
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('into students')) {
    const newId = MOCK_STUDENTS.length > 0 ? Math.max(...MOCK_STUDENTS.map(s => typeof s.id === 'number' ? s.id : 0)) + 1 : 1;
    const newStudent = {
      id: newId,
      user_id: Number(params[0]),
      student_id: params[1],
      roll_number: params[2],
      full_name: params[3],
      phone: params[4],
      email: params[5],
      branch: params[6],
      course: params[7],
      year: Number(params[8]),
      semester: Number(params[9]),
      admission_date: new Date().toISOString(),
      status: 'ACTIVE',
      bed_id: null
    };
    MOCK_STUDENTS.push(newStudent);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update students set bed_id')) {
    if (queryLower.includes('bed_id = null')) {
      const studentId = Number(params[0]);
      const student = MOCK_STUDENTS.find(s => s.id === studentId);
      if (student) student.bed_id = null;
    } else {
      const studentId = Number(params[1]);
      const student = MOCK_STUDENTS.find(s => s.id === studentId);
      if (student) student.bed_id = Number(params[0]);
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('from student_allocations')) {
    let result = MOCK_STUDENT_ALLOCATIONS.map(sa => {
      const rm = MOCK_ROOMS.find(r => r.id === sa.room_id);
      const bd = MOCK_BEDS.find(b => b.id === sa.bed_id);
      const st = MOCK_STUDENTS.find(s => s.id === sa.student_id);
      const h = MOCK_HOSTELS.find(h => h.id === sa.hostel_id) || (rm ? MOCK_HOSTELS.find(h => h.id === rm.hostel_id) : MOCK_HOSTELS[0]);
      const stuUser = st ? MOCK_USERS.find(u => u.id === st.user_id) : null;
      const u = MOCK_USERS.find(u => u.id === sa.allocated_by);
      return {
        ...sa,
        student_name: st ? st.full_name : 'John Doe',
        student_code: st ? st.student_id : 'STD2026001',
        roll_number: st ? st.roll_number : 'CSE-2026-089',
        student_status: st ? st.status : 'ACTIVE',
        branch: st ? st.branch : 'Computer Science',
        course: st ? st.course : 'B.Tech',
        photo_url: st ? st.photo_url : null,
        phone: st ? st.phone : '9876543210',
        email: st ? st.email : 'student@hostel.com',
        user_gender: stuUser ? stuUser.gender : (st ? st.gender : 'Male'),
        gender: stuUser ? stuUser.gender : (st ? st.gender : 'Male'),
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        hostel_code: h ? h.code : 'MBH',
        room_number: rm ? rm.room_number : (sa.room_id === 1 ? '101' : (sa.room_id === 2 ? '102' : '201')),
        bed_number: bd ? bd.bed_number : (sa.bed_id === 1 ? 'A-1' : (sa.bed_id === 2 ? 'A-2' : 'A-3')),
        allocated_by_username: u ? u.username : 'superadmin'
      };
    });

    if (queryLower.includes('sa.id = ?') || queryLower.includes('where sa.id = ?') || queryLower.includes('where id = ?')) {
      const targetId = Number(params[0]);
      const found = result.find(a => a.id === targetId);
      return [found ? [found] : []];
    }

    if (queryLower.includes('room_id = ?')) {
      const rId = Number(params[0]);
      result = result.filter(a => a.room_id === rId);
    }

    if (queryLower.includes('hostel_id = ?') || queryLower.includes('r.hostel_id = ?')) {
      const hId = Number(params[0]);
      result = result.filter(a => a.hostel_id === hId);
    }

    if (queryLower.includes('student_id = ?')) {
      const sId = Number(params[0]);
      result = result.filter(a => a.student_id === sId);
    }

    if (queryLower.includes('status = \'active\'') || queryLower.includes('sa.status = \'active\'')) {
      result = result.filter(a => a.status === 'ACTIVE');
    }

    if (queryLower.includes('count(*)')) {
      return [[{ cnt: result.length, total: result.length }]];
    }

    return [result];
  }

  // ── PHASE 14 SECURITY & USER MANAGEMENT MOCK HANDLERS ─────────────────────
  if (queryLower.includes('into security_audit_log')) {
    const newId = MOCK_SECURITY_AUDIT_LOG.length + 1;
    const newItem = {
      id: newId,
      user_id: params[0] ? Number(params[0]) : null,
      actor_id: params[1] ? Number(params[1]) : null,
      action: params[2],
      ip_address: params[3],
      user_agent: params[4],
      metadata: params[5],
      created_at: new Date().toISOString()
    };
    MOCK_SECURITY_AUDIT_LOG.push(newItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('from security_audit_log')) {
    if (queryLower.includes('count(*) as total')) {
      return [[{ total: MOCK_SECURITY_AUDIT_LOG.length }]];
    }
    const logs = MOCK_SECURITY_AUDIT_LOG.map(sal => {
      const u = MOCK_USERS.find(x => x.id === sal.user_id);
      const a = MOCK_USERS.find(x => x.id === sal.actor_id);
      return {
        ...sal,
        target_username: u ? u.username : null,
        target_email: u ? u.email : null,
        actor_username: a ? a.username : null,
        actor_email: a ? a.email : null
      };
    }).reverse();
    return [logs];
  }

  if (queryLower.includes('from roles')) {
    if (params && params[0]) {
      const r = MOCK_ROLES.find(x => x.name === params[0] || x.id === Number(params[0]));
      return r ? [[r]] : [[]];
    }
    return [MOCK_ROLES];
  }

  if (queryLower.includes('from users')) {
    let result = MOCK_USERS.map(u => {
      const r = MOCK_ROLES.find(role => role.id === u.role_id);
      return {
        ...u,
        role: u.role || (r ? r.name : 'STUDENT')
      };
    });

    if (queryLower.includes('username') || queryLower.includes('email')) {
      const id1 = params && params[0] ? String(params[0]).toLowerCase() : null;
      const id2 = params && params[1] ? String(params[1]).toLowerCase() : id1;
      result = result.filter(u => 
        (id1 && String(u.username).toLowerCase() === id1) || 
        (id2 && String(u.email).toLowerCase() === id2) ||
        (id1 && String(u.email).toLowerCase() === id1) ||
        (id2 && String(u.username).toLowerCase() === id2)
      );
    } else if (queryLower.includes('u.id = ?') || queryLower.includes('where u.id = ?') || queryLower.includes('id = ?')) {
      const uId = params ? Number(params[0]) : null;
      if (uId) {
        result = result.filter(u => u.id === uId);
      }
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: result.length }]];
    }

    return [result];
  }

  if (queryLower.includes('into users')) {
    const newId = MOCK_USERS.length > 0 ? Math.max(...MOCK_USERS.map(u => u.id)) + 1 : 1;
    let roleId = 3;
    let username = '';
    let email = '';
    let fullName = '';
    let gender = 'Male';
    let phone = '';
    let passwordHash = '';

    if (queryLower.includes('gender')) {
      // INSERT INTO users (role_id, username, email, full_name, gender, phone, password_hash, status) VALUES (3, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      roleId = 3;
      username = params[0];
      email = params[1];
      fullName = params[2];
      gender = params[3];
      phone = params[4];
      passwordHash = params[5];
    } else {
      roleId = Number(params[0]);
      username = params[1];
      email = params[2];
      passwordHash = params[3];
      fullName = username;
    }

    const roleObj = MOCK_ROLES.find(r => r.id === roleId) || { name: 'STUDENT' };
    const newUser = {
      id: newId,
      role_id: roleId,
      role: roleObj.name,
      username,
      email,
      full_name: fullName,
      gender,
      phone,
      password_hash: passwordHash,
      status: 'ACTIVE',
      must_change_password: 0,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_USERS.push(newUser);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update users')) {
    if (queryLower.includes('last_login_at = now()')) {
      const userId = Number(params[0]);
      const user = MOCK_USERS.find(u => u.id === userId);
      if (user) user.last_login_at = new Date().toISOString();
    } else if (queryLower.includes('password_hash = ?')) {
      const userId = Number(params[params.length - 1]);
      const user = MOCK_USERS.find(u => u.id === userId);
      if (user) {
        user.password_hash = params[0];
        if (queryLower.includes('must_change_password = 0')) user.must_change_password = 0;
        if (queryLower.includes('must_change_password = 1')) user.must_change_password = 1;
      }
    } else if (queryLower.includes('status = ?')) {
      const statusVal = params[0];
      const userId = Number(params[1]);
      const user = MOCK_USERS.find(u => u.id === userId);
      if (user) user.status = statusVal;
    } else if (queryLower.includes('role_id = ?')) {
      const roleIdVal = Number(params[0]);
      const userId = Number(params[1]);
      const user = MOCK_USERS.find(u => u.id === userId);
      const roleObj = MOCK_ROLES.find(r => r.id === roleIdVal);
      if (user) {
        user.role_id = roleIdVal;
        if (roleObj) user.role = roleObj.name;
      }
    } else if (queryLower.includes('email = ?')) {
      const emailVal = params[0];
      const userId = Number(params[params.length - 1]);
      const user = MOCK_USERS.find(u => u.id === userId);
      if (user) user.email = emailVal;
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('delete from superintendent_hostels')) {
    const userId = Number(params[0]);
    MOCK_SUPER_HOSTELS = MOCK_SUPER_HOSTELS.filter(sh => sh.user_id !== userId);
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('into superintendent_hostels')) {
    const newId = MOCK_SUPER_HOSTELS.length > 0 ? Math.max(...MOCK_SUPER_HOSTELS.map(sh => sh.id)) + 1 : 1;
    MOCK_SUPER_HOSTELS.push({
      id: newId,
      user_id: Number(params[0]),
      hostel_id: Number(params[1])
    });
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update students set user_id = ?')) {
    const userId = Number(params[0]);
    const studentId = Number(params[1]);
    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    if (student) student.user_id = userId;
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('update students set phone_number = ?')) {
    const phoneVal = params[0];
    const userId = Number(params[1]);
    const student = MOCK_STUDENTS.find(s => s.user_id === userId);
    if (student) student.phone = phoneVal;
    return [{ affectedRows: 1 }];
  }

  // 5. Mock Report Aggregations Handling
  if (queryLower.includes('from students') && queryLower.includes('group by')) {
    if (queryLower.includes('s.branch')) {
      return [[
        { branch: 'Computer Science', count: MOCK_STUDENTS.filter(s => s.branch === 'Computer Science' || !s.branch).length || 10 },
        { branch: 'Electrical Eng', count: MOCK_STUDENTS.filter(s => s.branch === 'Electrical Eng').length || 5 },
        { branch: 'Mechanical Eng', count: MOCK_STUDENTS.filter(s => s.branch === 'Mechanical Eng').length || 4 }
      ]];
    }
    if (queryLower.includes('s.course')) {
      return [[
        { course: 'B.Tech', count: MOCK_STUDENTS.filter(s => s.course === 'B.Tech' || !s.course).length || 15 },
        { course: 'M.Tech', count: MOCK_STUDENTS.filter(s => s.course === 'M.Tech').length || 4 }
      ]];
    }
    if (queryLower.includes('s.year')) {
      return [[
        { year: '1', count: 6 },
        { year: '2', count: 5 },
        { year: '3', count: 5 },
        { year: '4', count: 3 }
      ]];
    }
  }

  if (queryLower.includes('from hostels') && queryLower.includes('group by h.id')) {
    return [MOCK_HOSTELS.map(h => ({
      hostel_id: h.id,
      hostel_name: h.name,
      student_count: MOCK_STUDENTS.filter(s => s.hostel_id === h.id).length || 3,
      totalBeds: 50,
      occupied: 35,
      available: 12,
      maintenance: 3
    }))];
  }

  if (queryLower.includes('from attendance') && queryLower.includes('group by attendance_date')) {
    const today = new Date().toISOString().split('T')[0];
    return [[
      { attendance_date: today, present: 18, absent: 2, attendancePercentage: 90.0 }
    ]];
  }

  if (queryLower.includes('from complaints') && queryLower.includes('group by')) {
    if (queryLower.includes('category')) {
      return [[
        { category: 'PLUMBING', count: MOCK_COMPLAINTS.filter(c => c.category === 'PLUMBING').length || 3 },
        { category: 'ELECTRICITY', count: MOCK_COMPLAINTS.filter(c => c.category === 'ELECTRICITY').length || 2 },
        { category: 'CLEANLINESS', count: MOCK_COMPLAINTS.filter(c => c.category === 'CLEANLINESS').length || 1 }
      ]];
    }
    if (queryLower.includes('priority')) {
      return [[
        { priority: 'MEDIUM', count: 4 },
        { priority: 'HIGH', count: 2 },
        { priority: 'URGENT', count: 1 }
      ]];
    }
    if (queryLower.includes('date(created_at)')) {
      const today = new Date().toISOString().split('T')[0];
      return [[{ complaint_date: today, count: 2 }]];
    }
  }

  if (queryLower.includes('from visits') && queryLower.includes('group by')) {
    if (queryLower.includes('relation')) {
      return [[
        { relation: 'Parent', count: 4 },
        { relation: 'Friend', count: 2 },
        { relation: 'Relative', count: 1 }
      ]];
    }
    if (queryLower.includes('visit_date')) {
      const today = new Date().toISOString().split('T')[0];
      return [[{ visit_date: today, count: 3 }]];
    }
  }

  if (queryLower.includes('from meal_attendance') && queryLower.includes('group by ma.meal_type')) {
    return [[
      { meal_type: 'BREAKFAST', takingCount: 15, notTakingCount: 3, totalResponses: 18 },
      { meal_type: 'LUNCH', takingCount: 17, notTakingCount: 1, totalResponses: 18 },
      { meal_type: 'SNACKS', takingCount: 12, notTakingCount: 6, totalResponses: 18 },
      { meal_type: 'DINNER', takingCount: 16, notTakingCount: 2, totalResponses: 18 }
    ]];
  }

  if (queryLower.includes('from student_fees') && queryLower.includes('group by fee_type')) {
    return [[
      { fee_type: 'HOSTEL_FEE', expected: 150000.00, collected: 100000.00 },
      { fee_type: 'MESS_FEE', expected: 60000.00, collected: 45000.00 }
    ]];
  }

  if (queryLower.includes('from fee_payments') && queryLower.includes('group by fp.payment_date')) {
    const today = new Date().toISOString().split('T')[0];
    return [[
      { payment_date: today, total_collected: 25000.00, transaction_count: 2 }
    ]];
  }

  if (queryLower.includes('select coalesce(sum(amount)') || (queryLower.includes('from student_fees') && queryLower.includes('sum(paid_amount)'))) {
    const totalExp = MOCK_STUDENT_FEES.reduce((acc, f) => acc + (f.status !== 'WAIVED' ? Number(f.amount) : 0), 0) || 210000.00;
    const totalCol = MOCK_STUDENT_FEES.reduce((acc, f) => acc + (f.status !== 'WAIVED' ? Number(f.paid_amount) : 0), 0) || 145000.00;
    const totalWaived = MOCK_STUDENT_FEES.reduce((acc, f) => acc + (f.status === 'WAIVED' ? Number(f.amount) : 0), 0) || 0;
    return [[{
      totalExpected: totalExp,
      totalCollected: totalCol,
      totalPending: totalExp - totalCol,
      totalOverdue: 20000.00,
      totalWaived: totalWaived
    }]];
  }

  if (queryLower.includes('from rooms r') && queryLower.includes('join floors f') && (queryLower.includes('r.id = ?') || queryLower.includes('where r.id = ?'))) {
    const rId = Number(params[0]);
    if (rId === 999) return [[]];
    const rm = MOCK_ROOMS.find(r => r.id === rId);
    return rm ? [[{ room_id: rm.id, floor_id: rm.floor_id, hostel_id: rm.hostel_id }]] : [[]];
  }

  if (queryLower.includes('from floors') && queryLower.includes('where id = ?') && !queryLower.includes('select f.*') && !queryLower.includes('select hostel_id')) {
    const fId = Number(params[0]);
    if (fId === 999) return [[]];
    const fl = MOCK_FLOORS.find(f => f.id === fId);
    return fl ? [[{ floor_id: fl.id, hostel_id: fl.hostel_id }]] : [[]];
  }

  if (queryLower.includes('insert into maintenance_requests')) {
    const newId = MOCK_MAINTENANCE_REQUESTS.length > 0 ? Math.max(...MOCK_MAINTENANCE_REQUESTS.map(m => m.id)) + 1 : 1;
    const reqItem = {
      id: newId,
      hostel_id: params[0],
      floor_id: params[1],
      room_id: params[2],
      bed_id: params[3],
      category: params[4],
      title: params[5],
      description: params[6],
      priority: params[7],
      status: 'OPEN',
      reported_by: params[8],
      student_id: params[9],
      assigned_to: null,
      resolution_note: null,
      reported_at: new Date().toISOString(),
      started_at: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    MOCK_MAINTENANCE_REQUESTS.push(reqItem);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update maintenance_requests')) {
    if (queryLower.includes('assigned_to = ?')) {
      const assignedTo = Number(params[0]);
      const statusVal = params[1];
      const mId = Number(params[2]);
      const item = MOCK_MAINTENANCE_REQUESTS.find(m => m.id === mId);
      if (item) {
        item.assigned_to = assignedTo;
        item.status = statusVal;
      }
    } else if (queryLower.includes('priority = ?')) {
      const priorityVal = params[0];
      const mId = Number(params[1]);
      const item = MOCK_MAINTENANCE_REQUESTS.find(m => m.id === mId);
      if (item) item.priority = priorityVal;
    } else {
      const statusVal = params[0];
      const mId = Number(params[params.length - 1]);
      const item = MOCK_MAINTENANCE_REQUESTS.find(m => m.id === mId);
      if (item) {
        item.status = statusVal;
        if (params.length > 2) item.resolution_note = params[1];
      }
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('insert into maintenance_updates')) {
    const newId = MOCK_MAINTENANCE_UPDATES.length > 0 ? Math.max(...MOCK_MAINTENANCE_UPDATES.map(m => m.id)) + 1 : 1;
    const upd = {
      id: newId,
      maintenance_id: params[0],
      user_id: params[1],
      message: params[2],
      old_status: params[3] || null,
      new_status: params[4] || null,
      created_at: new Date().toISOString()
    };
    MOCK_MAINTENANCE_UPDATES.push(upd);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('from maintenance_updates')) {
    const mId = Number(params[0]);
    const res = MOCK_MAINTENANCE_UPDATES.filter(u => u.maintenance_id === mId).map(u => {
      const usr = MOCK_USERS.find(usr => usr.id === u.user_id);
      return {
        ...u,
        user_name: usr ? usr.username : 'user',
        user_role: usr ? usr.role : 'STAFF'
      };
    });
    return [res];
  }

  if (queryLower.includes('from maintenance_requests')) {
    let result = MOCK_MAINTENANCE_REQUESTS.map(mr => {
      const h = MOCK_HOSTELS.find(h => h.id === mr.hostel_id);
      const s = MOCK_STUDENTS.find(st => st.id === mr.student_id);
      const uRep = MOCK_USERS.find(u => u.id === mr.reported_by);
      const uAss = MOCK_USERS.find(u => u.id === mr.assigned_to);
      return {
        ...mr,
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        hostel_code: h ? h.code : 'MBH',
        floor_number: '1st Floor',
        room_number: '101',
        bed_number: 'A-1',
        student_name: s ? s.full_name : 'John Doe',
        student_code: s ? s.student_id : 'STD2026001',
        reporter_name: uRep ? uRep.username : 'student',
        reporter_email: uRep ? uRep.email : 'student@hostel.com',
        assignee_name: uAss ? uAss.username : null,
        assignee_email: uAss ? uAss.email : null
      };
    });

    if (queryLower.includes('where mr.id = ?') || queryLower.includes('mr.id = ?')) {
      const targetId = Number(params[0]);
      result = result.filter(mr => mr.id === targetId);
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: result.length }]];
    }

    return [result];
  }

  if (queryLower.includes('insert into room_inspections')) {
    const newId = MOCK_ROOM_INSPECTIONS.length > 0 ? Math.max(...MOCK_ROOM_INSPECTIONS.map(i => i.id)) + 1 : 1;
    const insp = {
      id: newId,
      hostel_id: params[0],
      floor_id: params[1],
      room_id: params[2],
      inspected_by: params[3],
      inspection_date: params[4],
      cleanliness_status: params[5],
      electrical_status: params[6],
      plumbing_status: params[7],
      furniture_status: params[8],
      bed_status: params[9],
      safety_status: params[10],
      remarks: params[11],
      created_at: new Date().toISOString()
    };
    MOCK_ROOM_INSPECTIONS.push(insp);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('from room_inspections')) {
    let result = MOCK_ROOM_INSPECTIONS.map(ri => {
      const h = MOCK_HOSTELS.find(h => h.id === ri.hostel_id);
      const u = MOCK_USERS.find(u => u.id === ri.inspected_by);
      return {
        ...ri,
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        hostel_code: h ? h.code : 'MBH',
        room_number: '101',
        inspector_name: u ? u.username : 'warden'
      };
    });

    if (queryLower.includes('where ri.room_id = ?') || queryLower.includes('room_id = ?')) {
      const rId = Number(params[0]);
      result = result.filter(r => r.room_id === rId);
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: result.length }]];
    }

    return [result];
  }

  // ── MASTER DATA HANDLERS (Hostels, Floors, Rooms, Beds) ──
  if (queryLower.includes('insert into hostels')) {
    const newId = MOCK_HOSTELS.length > 0 ? Math.max(...MOCK_HOSTELS.map(h => h.id)) + 1 : 1;
    const hostel = {
      id: newId,
      name: params[0],
      code: params[1],
      gender: params[2] || 'MALE',
      location: params[3] || 'Main Campus',
      status: params[4] || 'ACTIVE'
    };
    MOCK_HOSTELS.push(hostel);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update hostels')) {
    const targetId = Number(params[params.length - 1]);
    const hostel = MOCK_HOSTELS.find(h => h.id === targetId);
    if (hostel) {
      if (params[0]) hostel.name = params[0];
      if (params[1]) hostel.code = params[1];
      if (params[2]) hostel.gender = params[2];
      if (params[3]) hostel.location = params[3];
      if (params[4]) hostel.status = params[4];
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('delete from hostels')) {
    const targetId = Number(params[0]);
    const index = MOCK_HOSTELS.findIndex(h => h.id === targetId);
    if (index !== -1) MOCK_HOSTELS.splice(index, 1);
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('from hostels')) {
    let res = [...MOCK_HOSTELS];
    if (queryLower.includes('name = ? and id != ?')) {
      const nameVal = String(params[0]).trim().toLowerCase();
      const excludeId = Number(params[1]);
      res = res.filter(h => String(h.name).trim().toLowerCase() === nameVal && h.id !== excludeId);
    } else if (queryLower.includes('code = ? and id != ?')) {
      const codeVal = String(params[0]).trim().toLowerCase();
      const excludeId = Number(params[1]);
      res = res.filter(h => String(h.code).trim().toLowerCase() === codeVal && h.id !== excludeId);
    } else if (queryLower.includes('where name = ?') || queryLower.includes('name = ?')) {
      const nameVal = String(params[0]).trim().toLowerCase();
      res = res.filter(h => String(h.name).trim().toLowerCase() === nameVal);
    } else if (queryLower.includes('where code = ?') || queryLower.includes('code = ?')) {
      const codeVal = String(params[0]).trim().toLowerCase();
      res = res.filter(h => String(h.code).trim().toLowerCase() === codeVal);
    } else if (queryLower.includes('where id = ?') || queryLower.includes('h.id = ?') || queryLower.includes('id = ?')) {
      const hId = Number(params[0]);
      res = res.filter(h => h.id === hId);
    }
    if (queryLower.includes('count(*) as total')) {
      return [[{ total: res.length }]];
    }
    return [res];
  }

  if (queryLower.includes('insert into floors')) {
    const newId = MOCK_FLOORS.length > 0 ? Math.max(...MOCK_FLOORS.map(f => f.id)) + 1 : 1;
    const fl = {
      id: newId,
      hostel_id: Number(params[0]),
      floor_name: params[1],
      floor_number: Number(params[2]),
      status: params[3] || 'ACTIVE',
      created_at: new Date().toISOString()
    };
    MOCK_FLOORS.push(fl);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update floors')) {
    const targetId = Number(params[params.length - 1]);
    const fl = MOCK_FLOORS.find(f => f.id === targetId);
    if (fl) {
      if (params[0] !== undefined) fl.floor_name = params[0];
      if (params[1] !== undefined) fl.status = params[1];
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('delete from floors')) {
    const targetId = Number(params[0]);
    const index = MOCK_FLOORS.findIndex(f => f.id === targetId);
    if (index !== -1) MOCK_FLOORS.splice(index, 1);
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('total_floors') && queryLower.includes('total_rooms') && queryLower.includes('total_beds')) {
    const hostelId = Number(params[0]);
    const hostelFloors = MOCK_FLOORS.filter(f => f.hostel_id === hostelId);
    const hostelRooms = MOCK_ROOMS.filter(r => r.hostel_id === hostelId);
    const hostelBeds = MOCK_BEDS.filter(b => {
      const rm = MOCK_ROOMS.find(r => r.id === b.room_id);
      return rm && rm.hostel_id === hostelId;
    });
    const occupied = hostelBeds.filter(b => b.status === 'OCCUPIED' || MOCK_STUDENTS.some(s => s.bed_id === b.id && s.status === 'ACTIVE')).length;
    const available = hostelBeds.filter(b => b.status === 'AVAILABLE' && !MOCK_STUDENTS.some(s => s.bed_id === b.id && s.status === 'ACTIVE')).length;
    const maintenance = hostelBeds.filter(b => b.status === 'MAINTENANCE').length;
    return [[{
      total_floors: hostelFloors.length,
      total_rooms: hostelRooms.length,
      total_beds: hostelBeds.length,
      available_beds: available,
      occupied_beds: occupied,
      maintenance_beds: maintenance
    }]];
  }

  if (queryLower.includes('from floors f') || (queryLower.includes('from floors') && !queryLower.includes('from rooms r') && !queryLower.includes('from beds b') && !queryLower.includes('from student_allocations'))) {
    let res = MOCK_FLOORS.map(f => {
      const h = MOCK_HOSTELS.find(hostel => hostel.id === f.hostel_id);
      return {
        ...f,
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        hostel_code: h ? h.code : 'MBH'
      };
    });
    if (queryLower.includes('floor_name = ? and id != ?')) {
      const nameVal = String(params[1]).trim().toLowerCase();
      const excludeId = Number(params[2]);
      res = res.filter(f => String(f.floor_name).trim().toLowerCase() === nameVal && f.id !== excludeId);
    } else if (queryLower.includes('floor_number = ? and id != ?')) {
      const numVal = Number(params[1]);
      const excludeId = Number(params[2]);
      res = res.filter(f => f.floor_number === numVal && f.id !== excludeId);
    } else if (queryLower.includes('hostel_id = ? and floor_number = ?')) {
      const hId = Number(params[0]);
      const fNum = Number(params[1]);
      res = res.filter(f => f.hostel_id === hId && f.floor_number === fNum);
    } else if (queryLower.includes('hostel_id = ? and floor_name = ?')) {
      const hId = Number(params[0]);
      const fName = String(params[1]).trim().toLowerCase();
      res = res.filter(f => f.hostel_id === hId && String(f.floor_name || '').trim().toLowerCase() === fName);
    } else if (queryLower.includes('f.id = ?') || queryLower.includes('where f.id = ?') || queryLower.includes('where id = ?')) {
      const fId = Number(params[0]);
      res = res.filter(f => Number(f.id) === fId);
    } else if (queryLower.includes('where hostel_id = ?') || queryLower.includes('where f.hostel_id = ?') || queryLower.includes('f.hostel_id = ?')) {
      const hId = Number(params[0]);
      res = res.filter(f => Number(f.hostel_id) === hId);
    }
    if (queryLower.includes('count(*) as total')) {
      return [[{ total: res.length }]];
    }
    return [res];
  }

  if (queryLower.includes('insert into rooms')) {
    const newId = MOCK_ROOMS.length > 0 ? Math.max(...MOCK_ROOMS.map(r => r.id)) + 1 : 1;
    const rm = {
      id: newId,
      hostel_id: Number(params[0]),
      floor_id: Number(params[1]),
      room_number: params[2],
      capacity: Number(params[3]),
      status: params[4] || 'ACTIVE',
      created_at: new Date().toISOString()
    };
    MOCK_ROOMS.push(rm);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update rooms')) {
    const targetId = Number(params[params.length - 1]);
    const rm = MOCK_ROOMS.find(r => r.id === targetId);
    if (rm) {
      if (params[0] !== undefined) rm.room_number = params[0];
      if (params[1] !== undefined) rm.capacity = Number(params[1]);
      if (params[2] !== undefined) rm.status = params[2];
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('delete from rooms')) {
    const targetId = Number(params[0]);
    const index = MOCK_ROOMS.findIndex(r => r.id === targetId);
    if (index !== -1) MOCK_ROOMS.splice(index, 1);
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('from rooms r') || (queryLower.includes('from rooms') && !queryLower.includes('from beds b'))) {
    let res = MOCK_ROOMS.map(r => {
      const h = MOCK_HOSTELS.find(hostel => hostel.id === r.hostel_id);
      const f = MOCK_FLOORS.find(floor => floor.id === r.floor_id);
      return {
        ...r,
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        hostel_code: h ? h.code : 'MBH',
        floor_name: f ? f.floor_name : 'Ground Floor',
        floor_number: f ? f.floor_number : 1,
        occupied_beds: MOCK_BEDS.filter(b => b.room_id === r.id && b.status === 'OCCUPIED').length,
        total_beds: MOCK_BEDS.filter(b => b.room_id === r.id).length
      };
    });
    if (queryLower.includes('floor_id = ? and room_number = ? and id != ?')) {
      const fId = Number(params[0]);
      const rNum = String(params[1]).trim().toLowerCase();
      const excludeId = Number(params[2]);
      res = res.filter(r => r.floor_id === fId && String(r.room_number).trim().toLowerCase() === rNum && r.id !== excludeId);
    } else if (queryLower.includes('floor_id = ? and room_number = ?')) {
      const fId = Number(params[0]);
      const rNum = String(params[1]).trim().toLowerCase();
      res = res.filter(r => r.floor_id === fId && String(r.room_number).trim().toLowerCase() === rNum);
    } else if (queryLower.includes('hostel_id = ? and room_number = ?')) {
      const hId = Number(params[0]);
      const rNum = String(params[1]).trim().toLowerCase();
      res = res.filter(r => r.hostel_id === hId && String(r.room_number).trim().toLowerCase() === rNum);
    } else if (queryLower.includes('floor_id = ?') || queryLower.includes('r.floor_id = ?')) {
      const fId = Number(params[0]);
      res = res.filter(r => r.floor_id === fId);
    } else if (queryLower.includes('hostel_id = ?') || queryLower.includes('r.hostel_id = ?')) {
      const hId = Number(params[0]);
      res = res.filter(r => r.hostel_id === hId);
    } else if (queryLower.includes('r.id = ?') || queryLower.includes('where r.id = ?') || queryLower.includes('id = ?')) {
      const rId = Number(params[0]);
      res = res.filter(r => r.id === rId);
    }
    if (queryLower.trim().startsWith('select count(*)')) {
      return [[{ cnt: res.length, total: res.length }]];
    }
    return [res];
  }

  if (queryLower.includes('insert into beds')) {
    const newId = MOCK_BEDS.length > 0 ? Math.max(...MOCK_BEDS.map(b => b.id)) + 1 : 1;
    const bd = {
      id: newId,
      room_id: Number(params[0]),
      bed_number: params[1],
      status: params[2] || 'AVAILABLE',
      created_at: new Date().toISOString()
    };
    MOCK_BEDS.push(bd);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('update beds')) {
    const targetId = Number(params[params.length - 1]);
    const bd = MOCK_BEDS.find(b => b.id === targetId);
    if (bd) {
      if (queryLower.includes("status = 'occupied'")) {
        bd.status = 'OCCUPIED';
      } else if (queryLower.includes("status = 'available'")) {
        bd.status = 'AVAILABLE';
      } else if (queryLower.includes("status = 'maintenance'")) {
        bd.status = 'MAINTENANCE';
      } else if (params.length === 1 && queryLower.includes('status = ?')) {
        bd.status = params[0];
      } else if (params.length >= 2) {
        if (params[0] !== undefined) bd.bed_number = params[0];
        if (params[1] !== undefined) bd.status = params[1];
      }
    }
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('insert into users')) {
    const username = params[0] || 'student';
    const email = params[1] || `${username}@bec.ac.in`;
    const fullName = params[2] || username;
    const gender = params[3] || 'FEMALE';
    const existing = MOCK_USERS.find(u => u.username === username || u.email === email);
    if (existing) {
      return [{ insertId: existing.id, affectedRows: 1 }];
    }
    const newId = MOCK_USERS.length > 0 ? Math.max(...MOCK_USERS.map(u => typeof u.id === 'number' ? u.id : 0)) + 1 : 11;
    const newUser = {
      id: newId,
      role_id: 3,
      role: 'STUDENT',
      username,
      email,
      full_name: fullName,
      gender,
      password_hash: params[5] || '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe',
      status: 'ACTIVE',
      must_change_password: 0,
      last_login_at: new Date().toISOString()
    };
    MOCK_USERS.push(newUser);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('insert into students')) {
    const userId = Number(params[0]);
    const studentId = params[1] || `STD2026${String(userId).padStart(3, '0')}`;
    const rollNo = params[2] || studentId;
    const fullName = params[3] || rollNo;
    const phone = params[4] || '9876543210';
    const email = params[5] || `${rollNo}@bec.ac.in`;
    const branch = params[6] || 'Computer Science';
    const year = Number(params[7]) || 1;
    const semester = Number(params[8]) || 1;

    const existing = MOCK_STUDENTS.find(s => s.user_id === userId || s.roll_number === rollNo || s.email === email);
    if (existing) {
      return [{ insertId: existing.id, affectedRows: 1 }];
    }
    const newId = MOCK_STUDENTS.length > 0 ? Math.max(...MOCK_STUDENTS.map(s => typeof s.id === 'number' ? s.id : 0)) + 1 : 11;
    const newStudent = {
      id: newId,
      user_id: userId,
      student_id: studentId,
      roll_number: rollNo,
      full_name: fullName,
      phone,
      email,
      branch,
      course: 'B.Tech',
      year,
      semester,
      bed_id: null,
      hostel_id: null,
      room_number: null,
      bed_number: null,
      hostel_name: null,
      admission_date: new Date().toISOString(),
      status: 'ACTIVE'
    };
    MOCK_STUDENTS.push(newStudent);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('delete from beds')) {
    const targetId = Number(params[0]);
    const index = MOCK_BEDS.findIndex(b => b.id === targetId);
    if (index !== -1) MOCK_BEDS.splice(index, 1);
    return [{ affectedRows: 1 }];
  }

  if (queryLower.includes('from beds')) {
    let res = MOCK_BEDS.map(b => {
      const rm = MOCK_ROOMS.find(r => r.id === b.room_id) || MOCK_ROOMS[0];
      const h = MOCK_HOSTELS.find(hostel => hostel.id === (rm ? rm.hostel_id : 1));
      const s = MOCK_STUDENTS.find(st => st.bed_id === b.id);
      return {
        ...b,
        room_number: rm ? rm.room_number : '101',
        hostel_id: rm ? rm.hostel_id : 1,
        hostel_name: h ? h.name : 'BEC Boys Hostel 1',
        hostel_code: h ? h.code : 'MBH',
        student_name: s ? s.full_name : null,
        student_code: s ? s.student_id : null
      };
    });
    if (queryLower.includes('room_id = ? and bed_number = ? and id != ?')) {
      const rId = Number(params[0]);
      const bNum = String(params[1]).trim().toLowerCase();
      const excludeId = Number(params[2]);
      res = res.filter(b => b.room_id === rId && String(b.bed_number).trim().toLowerCase() === bNum && b.id !== excludeId);
    } else if (queryLower.includes('room_id = ? and bed_number = ?')) {
      const rId = Number(params[0]);
      const bNum = String(params[1]).trim().toLowerCase();
      res = res.filter(b => b.room_id === rId && String(b.bed_number).trim().toLowerCase() === bNum);
    } else if (queryLower.includes('hostel_id = ?') || queryLower.includes('r.hostel_id = ?')) {
      const hId = Number(params[0]);
      res = res.filter(b => b.hostel_id === hId);
    } else if (queryLower.includes('room_id = ?') || queryLower.includes('b.room_id = ?')) {
      const rId = Number(params[0]);
      res = res.filter(b => b.room_id === rId);
    } else if (queryLower.includes('b.id = ?') || queryLower.includes('where b.id = ?') || queryLower.includes('id = ?')) {
      const bId = Number(params[0]);
      res = res.filter(b => b.id === bId);
    }

    if (queryLower.includes('b.status = \'occupied\'') || queryLower.includes('status = \'occupied\'')) {
      res = res.filter(b => b.status === 'OCCUPIED');
    }

    if (queryLower.includes('count(*)')) {
      return [[{ cnt: res.length, total: res.length }]];
    }
    return [res];
  }

  if (queryLower.includes('insert into activity_log')) {
    const newId = MOCK_ACTIVITY_LOGS.length > 0 ? Math.max(...MOCK_ACTIVITY_LOGS.map(a => a.id)) + 1 : 1;
    const item = {
      id: newId,
      actor_id: params[0],
      action: params[1],
      module: params[2],
      entity_type: params[3],
      entity_id: params[4],
      hostel_id: params[5],
      student_id: params[6],
      description: params[7],
      metadata: params[8],
      created_at: new Date().toISOString()
    };
    MOCK_ACTIVITY_LOGS.push(item);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (queryLower.includes('from activity_log')) {
    let res = MOCK_ACTIVITY_LOGS.map(al => {
      const u = MOCK_USERS.find(usr => usr.id === al.actor_id);
      const h = MOCK_HOSTELS.find(hostel => hostel.id === al.hostel_id);
      return {
        ...al,
        actor_name: u ? u.username : 'user',
        actor_role: u ? u.role : 'USER',
        hostel_name: h ? h.name : 'BEC Boys Hostel 1'
      };
    });

    if (queryLower.includes('al.module = ?') || queryLower.includes('module = ?')) {
      const mod = params.find(p => typeof p === 'string');
      if (mod) res = res.filter(a => a.module === mod.toUpperCase());
    }

    if (queryLower.includes('count(*) as total')) {
      return [[{ total: res.length }]];
    }

    return [res];
  }

  // Fallback / default mock response
  return [[]];
};

// Unified Pool wrapper delegating to live MySQL or Mock fallback
const pool = {
  query: async (sql, params) => {
    if (isOffline) {
      return mockQuery(sql, params);
    }
    try {
      return await realPool.query(sql, params);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR' || error.message.includes('denied')) {
        isOffline = true;
        console.warn('\x1b[33m%s\x1b[0m', 'Database offline. Mock database engine activated.');
        return mockQuery(sql, params);
      }
      throw error;
    }
  },
  getConnection: async () => {
    if (isOffline) {
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        query: async (sql, params) => mockQuery(sql, params),
        release: () => {}
      };
    }
    try {
      return await realPool.getConnection();
    } catch (error) {
      isOffline = true;
      console.warn('\x1b[33m%s\x1b[0m', 'Database offline. Mock database engine activated.');
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        query: async (sql, params) => mockQuery(sql, params),
        release: () => {}
      };
    }
  },
  end: async () => {
    if (isOffline) return;
    return realPool.end();
  }
};

const testConnection = async () => {
  try {
    const connection = await realPool.getConnection();
    console.log('\x1b[32m%s\x1b[0m', 'MySQL Database connected successfully.');
    connection.release();
    return true;
  } catch (error) {
    isOffline = true;
    console.error('\x1b[31m%s\x1b[0m', 'MySQL Database connection failed:');
    console.error(error.message);
    console.warn('\x1b[33m%s\x1b[0m', 'Development Fallback: Mock database engine activated.');
    return false;
  }
};

module.exports = {
  pool,
  testConnection
};
