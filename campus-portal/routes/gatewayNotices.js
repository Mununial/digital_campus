const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/authGateway');

// In-Memory Campus Notice & Circular Store
const noticeStore = {
  notices: [
    {
      id: "NTC-2026-001",
      title: "BPUT Even Semester (6th & 8th Sem) Final Examination Timetable Released",
      publisher: "Exam Cell Controller",
      publisherRole: "Examination Dept",
      category: "EXAM_CELL",
      deptScope: "ALL",
      semScope: "All Semesters",
      priority: "EMERGENCY", // EMERGENCY, URGENT, NORMAL
      isPinned: true,
      content: "All B.Tech students appearing for the BPUT 6th and 8th Semester regular & back examinations 2026 are hereby informed that the official schedule has been published. Hall tickets will be issued at Desk-3 from 28th September. Attendance below 75% will not be condoned under any circumstances.",
      attachmentUrl: "#",
      attachmentName: "BPUT_Exam_Timetable_2026.pdf",
      publishedAt: "2026-09-25T09:30:00.000Z",
      formattedDate: "25 Sep 2026 • 09:30 AM",
      viewsCount: 1482
    },
    {
      id: "NTC-2026-002",
      title: "TCS Ninja & Digital On-Campus Recruitment Drive 2026 Batch",
      publisher: "Training & Placement Cell",
      publisherRole: "T&P Officer Desk",
      category: "PLACEMENT",
      deptScope: "CSE",
      semScope: "7th & 8th Sem",
      priority: "URGENT",
      isPinned: true,
      content: "Tata Consultancy Services (TCS) is conducting a pool campus recruitment drive for 2026 passing out B.Tech CSE, ECE & EEE students. Minimum CGPA required is 6.0 with no active backlogs. Interested candidates must submit their resume and TCS NQT Hall Ticket number by 30th September 5:00 PM.",
      attachmentUrl: "#",
      attachmentName: "TCS_Campus_Drive_Eligibility.pdf",
      publishedAt: "2026-09-24T14:15:00.000Z",
      formattedDate: "24 Sep 2026 • 02:15 PM",
      viewsCount: 940
    },
    {
      id: "NTC-2026-003",
      title: "Compulsory Registration for 2026-27 Odd Semester & Library Clearance",
      publisher: "Principal Office",
      publisherRole: "Dean Academics",
      category: "ACADEMIC",
      deptScope: "ALL",
      semScope: "All Batches",
      priority: "NORMAL",
      isPinned: false,
      content: "Notice is hereby given to all 2nd, 3rd, and 4th-year engineering students to complete their semester readmission fee deposit and secure No-Dues Clearance from the Central Library before 5th October 2026.",
      attachmentUrl: "#",
      attachmentName: "Semester_Registration_Notice.pdf",
      publishedAt: "2026-09-22T11:00:00.000Z",
      formattedDate: "22 Sep 2026 • 11:00 AM",
      viewsCount: 620
    },
    {
      id: "NTC-2026-004",
      title: "Hostel Night Gate Pass Rules & Mandatory Biometric Punching",
      publisher: "Chief Warden",
      publisherRole: "Hostel Administration",
      category: "HOSTEL",
      deptScope: "ALL",
      semScope: "Hostel Boarders",
      priority: "URGENT",
      isPinned: false,
      content: "All boy and girl boarders residing in Block A, B & C hostels must adhere strictly to the 7:30 PM gate curfew. Digital gate passes must be applied 24 hours prior via the Hostel Module. Late entry will incur disciplinary reporting.",
      attachmentUrl: "#",
      attachmentName: "Hostel_Rules_2026.pdf",
      publishedAt: "2026-09-20T17:45:00.000Z",
      formattedDate: "20 Sep 2026 • 05:45 PM",
      viewsCount: 815
    },
    {
      id: "NTC-2026-005",
      title: "Annual Inter-Departmental Robotics & AI Hackathon 'TechSparks 2026'",
      publisher: "HOD Computer Science",
      publisherRole: "Dept of CSE",
      category: "EVENTS",
      deptScope: "CSE",
      semScope: "All Semesters",
      priority: "NORMAL",
      isPinned: false,
      content: "The Department of Computer Science & Engineering is organizing 'TechSparks 2026', a 24-hour hackathon on 10th October. Exciting cash prizes of ₹50,000 for winning teams. Register your team of 4 on the student doorway.",
      attachmentUrl: "#",
      attachmentName: "TechSparks_Hackathon_Rulebook.pdf",
      publishedAt: "2026-09-18T10:00:00.000Z",
      formattedDate: "18 Sep 2026 • 10:00 AM",
      viewsCount: 512
    }
  ]
};

// GET Public / Student Notices Feed (Search, Department & Category Filter)
router.get('/', (req, res) => {
  const { category, dept, search, pinnedOnly } = req.query;
  let list = noticeStore.notices;

  if (category && category !== 'ALL') {
    list = list.filter(n => n.category.toUpperCase() === category.toUpperCase());
  }

  if (dept && dept !== 'ALL') {
    list = list.filter(n => n.deptScope === 'ALL' || n.deptScope.toUpperCase() === dept.toUpperCase());
  }

  if (pinnedOnly === 'true') {
    list = list.filter(n => n.isPinned);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(n => 
      n.title.toLowerCase().includes(q) ||
      n.publisher.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  }

  res.status(200).json({
    success: true,
    data: {
      total: list.length,
      pinnedCount: list.filter(n => n.isPinned).length,
      emergencyCount: list.filter(n => n.priority === 'EMERGENCY').length,
      notices: list
    }
  });
});

// GET Single Notice Detail & Increment View Counter
router.get('/view/:id', (req, res) => {
  const notice = noticeStore.notices.find(n => n.id === req.params.id);
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Notice circular not found.' });
  }

  notice.viewsCount = (notice.viewsCount || 0) + 1;

  res.status(200).json({
    success: true,
    data: notice
  });
});

// -------------------------------------------------------------
// NOTICE ADMIN / BROADCAST DESK REST APIS
// -------------------------------------------------------------

// GET Admin Statistics & Telemetry
router.get('/admin/stats', (req, res) => {
  const totalNotices = noticeStore.notices.length;
  const emergencyCount = noticeStore.notices.filter(n => n.priority === 'EMERGENCY').length;
  const totalViews = noticeStore.notices.reduce((sum, n) => sum + (n.viewsCount || 0), 0);
  const pinnedCount = noticeStore.notices.filter(n => n.isPinned).length;

  res.status(200).json({
    success: true,
    data: {
      totalNotices,
      emergencyCount,
      totalViews,
      pinnedCount,
      categories: {
        academic: noticeStore.notices.filter(n => n.category === 'ACADEMIC').length,
        examCell: noticeStore.notices.filter(n => n.category === 'EXAM_CELL').length,
        placement: noticeStore.notices.filter(n => n.category === 'PLACEMENT').length,
        hostel: noticeStore.notices.filter(n => n.category === 'HOSTEL').length,
        events: noticeStore.notices.filter(n => n.category === 'EVENTS').length
      }
    }
  });
});

// POST Publish New Notice Circular
router.post('/admin/create', (req, res) => {
  const { title, publisher, publisherRole, category, deptScope, semScope, priority, isPinned, content, attachmentUrl, attachmentName } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Notice Title and Content Body are required.'
    });
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                        ' • ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const newNotice = {
    id: `NTC-2026-${String(noticeStore.notices.length + 1).padStart(3, '0')}`,
    title: title.trim(),
    publisher: publisher || "Notice & Circular Officer",
    publisherRole: publisherRole || "Principal Office",
    category: category || "ACADEMIC",
    deptScope: deptScope || "ALL",
    semScope: semScope || "All Semesters",
    priority: priority || "NORMAL",
    isPinned: Boolean(isPinned),
    content: content.trim(),
    attachmentUrl: attachmentUrl || "#",
    attachmentName: attachmentName || "Official_Notice.pdf",
    publishedAt: now.toISOString(),
    formattedDate,
    viewsCount: 1
  };

  noticeStore.notices.unshift(newNotice);

  res.status(201).json({
    success: true,
    message: `Notice "${newNotice.title}" published successfully to Digital Bulletin Board!`,
    data: newNotice
  });
});

// PUT Toggle Pin / Update Notice
router.put('/admin/:id', (req, res) => {
  const notice = noticeStore.notices.find(n => n.id === req.params.id);
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Notice not found.' });
  }

  if (req.body.isPinned !== undefined) {
    notice.isPinned = Boolean(req.body.isPinned);
  }
  if (req.body.title) notice.title = req.body.title;
  if (req.body.content) notice.content = req.body.content;
  if (req.body.priority) notice.priority = req.body.priority;

  res.status(200).json({
    success: true,
    message: `Notice updated successfully.`,
    data: notice
  });
});

// DELETE Archive / Remove Notice
router.delete('/admin/:id', (req, res) => {
  const idx = noticeStore.notices.findIndex(n => n.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Notice not found.' });
  }

  const removed = noticeStore.notices.splice(idx, 1)[0];

  res.status(200).json({
    success: true,
    message: `Notice circular "${removed.title}" archived and removed.`,
    data: removed
  });
});

module.exports = router;
