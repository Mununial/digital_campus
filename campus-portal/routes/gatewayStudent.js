const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/authGateway');

// Student Mock Data Store matching the 12 approved screens
const studentData = {
  profile: {
    fullName: "Rohan Kumar",
    rollNo: "24CSE018",
    email: "rohan24@bec.ac.in",
    phone: "+91 9876543210",
    dob: "12 Jan 2005",
    bloodGroup: "B+",
    guardianName: "Sanjay Kumar",
    guardianPhone: "+91 8765432109",
    address: "Bhubaneswar, Odisha",
    branch: "B.Tech CSE (Data Science)",
    semester: "4th Semester",
    status: "Active Student"
  },
  stats: {
    hostel: {
      room: "Room 204",
      block: "Block A",
      bed: "Bed 2",
      hostelName: "Meridian Boys Hostel Block A"
    },
    attendance: {
      overall: 86.4,
      threshold: 75,
      isAboveLimit: true
    },
    library: {
      issuedBooksCount: 2,
      dueDays: 5
    },
    fees: {
      total: 85000,
      paid: 80500,
      pending: 4500
    }
  },
  roommates: [
    { name: "Amit", roll: "24CSE015", avatar: "A" },
    { name: "Rahul", roll: "24CSE021", avatar: "R" },
    { name: "Sourav", roll: "24CSE029", avatar: "S" }
  ],
  messMenu: {
    today: [
      { meal: "Breakfast", timing: "7:00 AM - 9:00 AM", items: "Poha, Bread, Tea", image: "/assets/poha.jpg" },
      { meal: "Lunch", timing: "12:00 PM - 2:00 PM", items: "Rice, Dal, Paneer, Salad", image: "/assets/lunch.jpg" },
      { meal: "Dinner", timing: "7:00 PM - 9:00 PM", items: "Rice, Dal, Chicken, Vegetable", image: "/assets/dinner.jpg" }
    ],
    tomorrow: [
      { meal: "Breakfast", timing: "7:00 AM - 9:00 AM", items: "Idli, Sambar, Chutney", image: "/assets/idli.jpg" },
      { meal: "Lunch", timing: "12:00 PM - 2:00 PM", items: "Rice, Rajma, Aloo Gobi, Raita", image: "/assets/lunch.jpg" },
      { meal: "Dinner", timing: "7:00 PM - 9:00 PM", items: "Roti, Dal Tadka, Paneer Butter Masala", image: "/assets/dinner.jpg" }
    ]
  },
  attendanceSubjects: [
    { name: "Data Structures", code: "CS201", percentage: 88, attended: 22, total: 25 },
    { name: "IoT", code: "CS202", percentage: 82, attended: 23, total: 28 },
    { name: "DBMS", code: "CS207", percentage: 91, attended: 29, total: 32 },
    { name: "Operating System", code: "CS301", percentage: 84, attended: 21, total: 25 },
    { name: "Computer Networks", code: "CS302", percentage: 87, attended: 26, total: 30 }
  ],
  notices: [
    {
      id: 1,
      title: "Campus Closure Notice",
      category: "Important",
      desc: "Due to maintenance activity, college will remain closed this Saturday.",
      date: "22 Sep 2026",
      urgent: true
    },
    {
      id: 2,
      title: "Mess Menu Updated",
      category: "Hostel",
      desc: "Check tomorrow's special festival feast menu.",
      date: "21 Sep 2026",
      urgent: false
    },
    {
      id: 3,
      title: "Freshers Orientation",
      category: "Academic",
      desc: "Venue: Conference Hall at 10:00 AM.",
      date: "20 Sep 2026",
      urgent: false
    },
    {
      id: 4,
      title: "Library Timings Changed",
      category: "Academic",
      desc: "New evening timings from 8:00 AM to 10:00 PM effective next week.",
      date: "19 Sep 2026",
      urgent: false
    }
  ],
  serviceRequests: [
    {
      id: "REQ-2026-01842",
      title: "Fan not working",
      room: "Room 204",
      date: "12 Sep 2026",
      status: "In Progress",
      badgeClass: "badge-in-progress"
    },
    {
      id: "REQ-2026-01812",
      title: "Gate pass to home",
      room: "Room 204",
      date: "10 Sep 2026",
      status: "Approved",
      badgeClass: "badge-approved"
    },
    {
      id: "REQ-2026-01801",
      title: "Leave application",
      room: "Room 204",
      date: "8 Sep 2026",
      status: "Resolved",
      badgeClass: "badge-resolved"
    },
    {
      id: "REQ-2026-01758",
      title: "Mess food complaint",
      room: "Mess Hall 1",
      date: "5 Sep 2026",
      status: "Resolved",
      badgeClass: "badge-resolved"
    }
  ],
  activityFeed: [
    {
      id: 1,
      type: "Requests",
      title: "Your complaint has been assigned",
      desc: "Fan not working - Room 204",
      time: "12 Sep 2026, 10:24 AM",
      icon: "wrench"
    },
    {
      id: 2,
      type: "Requests",
      title: "Gate pass approved",
      desc: "Valid for departure to hometown",
      time: "10 Sep 2026, 4:12 PM",
      icon: "check-circle"
    },
    {
      id: 3,
      type: "System",
      title: "Library book due in 2 days",
      desc: "Database Management System (R. Elmasri)",
      time: "10 Sep 2026, 9:00 AM",
      icon: "book"
    },
    {
      id: 4,
      type: "Payments",
      title: "Fee payment successful",
      desc: "Hostel Fee installment - ₹10,000",
      time: "8 Sep 2026, 6:30 PM",
      icon: "credit-card"
    },
    {
      id: 5,
      type: "System",
      title: "New notice published",
      desc: "Freshers Orientation details announced",
      time: "8 Sep 2026, 11:00 AM",
      icon: "bell"
    }
  ]
};

// GET Dashboard Aggregation
router.get('/dashboard', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      profile: studentData.profile,
      stats: studentData.stats,
      recentActivity: studentData.activityFeed.slice(0, 3)
    }
  });
});

// GET Profile Details
router.get('/profile', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: studentData.profile
  });
});

// GET Hostel Details
router.get('/hostel', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      hostelInfo: studentData.stats.hostel,
      roommates: studentData.roommates
    }
  });
});

// GET Mess Details
router.get('/mess', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: studentData.messMenu
  });
});

// GET Attendance Details
router.get('/attendance', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      overall: studentData.stats.attendance,
      subjects: studentData.attendanceSubjects
    }
  });
});

// GET Fees Details
router.get('/fees', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: studentData.stats.fees
  });
});

// GET Notices
router.get('/notices', optionalAuth, (req, res) => {
  const category = req.query.category;
  let list = studentData.notices;
  if (category && category.toLowerCase() !== 'all') {
    list = list.filter(n => n.category.toLowerCase() === category.toLowerCase());
  }
  res.status(200).json({
    success: true,
    data: list
  });
});

// GET Service Requests
router.get('/requests', optionalAuth, (req, res) => {
  const status = req.query.status;
  let list = studentData.serviceRequests;
  if (status && status.toLowerCase() !== 'all') {
    list = list.filter(r => r.status.toLowerCase().replace(/\s+/g, '') === status.toLowerCase().replace(/\s+/g, ''));
  }
  res.status(200).json({
    success: true,
    data: list
  });
});

// POST Create New Service Request
router.post('/requests', optionalAuth, (req, res) => {
  const { title, description, category } = req.body;
  const newReq = {
    id: `REQ-2026-0${Math.floor(1000 + Math.random() * 9000)}`,
    title: title || 'Campus Service Request',
    room: 'Room 204',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: 'Pending',
    badgeClass: 'badge-pending'
  };
  studentData.serviceRequests.unshift(newReq);
  studentData.activityFeed.unshift({
    id: Date.now(),
    type: 'Requests',
    title: `New request submitted: ${title}`,
    desc: description || 'Under review by college administration',
    time: 'Just now',
    icon: 'wrench'
  });
  res.status(201).json({
    success: true,
    message: 'Service request created successfully',
    data: newReq
  });
});

// GET Activity
router.get('/activity', optionalAuth, (req, res) => {
  const filter = req.query.type;
  let list = studentData.activityFeed;
  if (filter && filter.toLowerCase() !== 'all') {
    list = list.filter(a => a.type.toLowerCase() === filter.toLowerCase());
  }
  res.status(200).json({
    success: true,
    data: list
  });
});

module.exports = router;
