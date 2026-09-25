const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/authGateway');

// In-Memory Library Store
const libraryStore = {
  catalog: [
    { id: "BK-101", title: "Database Management System", author: "R. Elmasri, S. Navathe", isbn: "978-0133970777", dept: "CSE", category: "Core Engineering", shelf: "Rack A-04", available: 12, total: 15 },
    { id: "BK-102", title: "Java: The Complete Reference", author: "Herbert Schildt", isbn: "978-1260440232", dept: "CSE", category: "Programming", shelf: "Rack A-07", available: 8, total: 10 },
    { id: "BK-103", title: "Data Structures Using C", author: "Reema Thareja", isbn: "978-0198099307", dept: "CSE", category: "Core Engineering", shelf: "Rack B-01", available: 6, total: 12 },
    { id: "BK-104", title: "Operating System Concepts", author: "Silberschatz, Galvin, Gagne", isbn: "978-1118063330", dept: "CSE", category: "Core Engineering", shelf: "Rack B-05", available: 5, total: 10 },
    { id: "BK-105", title: "Computer Networks (5th Edition)", author: "Andrew S. Tanenbaum", isbn: "978-0132126953", dept: "CSE", category: "Networking", shelf: "Rack C-02", available: 14, total: 20 },
    { id: "BK-106", title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell, Peter Norvig", isbn: "978-0136042594", dept: "CSE", category: "AI & ML", shelf: "Rack C-08", available: 3, total: 8 },
    { id: "BK-107", title: "Thermodynamics: An Engineering Approach", author: "Yunus A. Cengel, Michael A. Boles", isbn: "978-0073398174", dept: "MECH", category: "Thermal Science", shelf: "Rack D-01", available: 9, total: 14 },
    { id: "BK-108", title: "Theory of Machines", author: "S. S. Rattan", isbn: "978-9351343479", dept: "MECH", category: "Design Engineering", shelf: "Rack D-06", available: 7, total: 12 },
    { id: "BK-109", title: "Basic Electrical Engineering", author: "D. P. Kothari, I. J. Nagrath", isbn: "978-9352606443", dept: "EEE", category: "Electrical Fundamentals", shelf: "Rack E-02", available: 11, total: 16 },
    { id: "BK-110", title: "Digital Design", author: "M. Morris Mano, Michael D. Ciletti", isbn: "978-0132774208", dept: "ECE", category: "Digital Electronics", shelf: "Rack E-08", available: 5, total: 9 },
    { id: "BK-111", title: "Surveying (Vol. 1 & 2)", author: "B. C. Punmia, Ashok Jain", isbn: "978-8170088530", dept: "CIVIL", category: "Civil Structures", shelf: "Rack F-03", available: 10, total: 15 },
    { id: "BK-112", title: "Higher Engineering Mathematics", author: "B. S. Grewal", isbn: "978-8174091955", dept: "BASIC SCIENCE", category: "Mathematics", shelf: "Rack G-01", available: 18, total: 25 }
  ],
  loans: [
    {
      id: "LN-501",
      rollNo: "BEC26002",
      studentName: "Rahul Jamana",
      bookId: "BK-101",
      bookTitle: "Database Management System",
      author: "R. Elmasri, S. Navathe",
      isbn: "978-0133970777",
      dept: "CSE",
      issueDate: "2026-09-14",
      dueDate: "2026-09-28",
      status: "ACTIVE", // ACTIVE, OVERDUE, RETURNED
      fineAmount: 0,
      renewable: true
    },
    {
      id: "LN-502",
      rollNo: "BEC26002",
      studentName: "Rahul Jamana",
      bookId: "BK-102",
      bookTitle: "Java: The Complete Reference",
      author: "Herbert Schildt",
      isbn: "978-1260440232",
      dept: "CSE",
      issueDate: "2026-09-16",
      dueDate: "2026-09-30",
      status: "ACTIVE",
      fineAmount: 0,
      renewable: true
    },
    {
      id: "LN-503",
      rollNo: "2101211045",
      studentName: "Priya Sharma",
      bookId: "BK-103",
      bookTitle: "Data Structures Using C",
      author: "Reema Thareja",
      isbn: "978-0198099307",
      dept: "CSE",
      issueDate: "2026-09-02",
      dueDate: "2026-09-16",
      status: "OVERDUE",
      fineAmount: 18,
      renewable: false
    },
    {
      id: "LN-504",
      rollNo: "BEC26001",
      studentName: "Aditya Verma",
      bookId: "BK-107",
      bookTitle: "Thermodynamics: An Engineering Approach",
      author: "Yunus A. Cengel",
      isbn: "978-0073398174",
      dept: "MECH",
      issueDate: "2026-09-10",
      dueDate: "2026-09-24",
      status: "OVERDUE",
      fineAmount: 2,
      renewable: true
    },
    {
      id: "LN-505",
      rollNo: "2101211088",
      studentName: "Soumya Ranjan Das",
      bookId: "BK-105",
      bookTitle: "Computer Networks (5th Edition)",
      author: "Andrew S. Tanenbaum",
      isbn: "978-0132126953",
      dept: "CSE",
      issueDate: "2026-09-20",
      dueDate: "2026-10-04",
      status: "ACTIVE",
      fineAmount: 0,
      renewable: true
    }
  ],
  digitalNotes: [
    { id: "NOTE-1", title: "DBMS Unit 1-4 Complete Lecture Notes", subject: "Database Systems", code: "RCS5C001", dept: "CSE", sem: "5th Sem", year: "2026", link: "#", downloads: 342 },
    { id: "NOTE-2", title: "BPUT 2025 Regular Exam Question Paper", subject: "Design & Analysis of Algorithms", code: "RCS5C002", dept: "CSE", sem: "5th Sem", year: "2025", link: "#", downloads: 512 },
    { id: "NOTE-3", title: "Operating Systems Hand-Written BPUT Notes", subject: "Operating Systems", code: "RCS4C001", dept: "CSE", sem: "4th Sem", year: "2026", link: "#", downloads: 289 },
    { id: "NOTE-4", title: "Fluid Mechanics & Turbo Machinery PYQs", subject: "Fluid Mechanics", code: "RME3C002", dept: "MECH", sem: "3rd Sem", year: "2025", link: "#", downloads: 145 },
    { id: "NOTE-5", title: "Control Systems Formula Sheet & BPUT Solutions", subject: "Control Systems", code: "REE4C001", dept: "EEE", sem: "4th Sem", year: "2026", link: "#", downloads: 198 }
  ],
  rules: [
    "Students can issue up to 3 books at a time for 14 days.",
    "A fine of ₹2 per day is levied on overdue books past the due date.",
    "Reference books and journals must be read inside the Central Reading Hall.",
    "Digital library terminals and IEEE/Springer journals are accessible 8:00 AM - 8:00 PM."
  ]
};

// -------------------------------------------------------------
// STUDENT APIS
// -------------------------------------------------------------

// GET Library Overview for current student
router.get('/', optionalAuth, (req, res) => {
  const rollNo = (req.user && req.user.rollNo) || req.query.rollNo || "BEC26002";
  const myLoans = libraryStore.loans.filter(l => l.rollNo.toUpperCase() === rollNo.toUpperCase() && l.status !== 'RETURNED');
  const totalFine = myLoans.reduce((sum, item) => sum + (item.fineAmount || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      issuedBooks: myLoans,
      reservationsCount: 0,
      finePending: totalFine,
      rules: libraryStore.rules,
      catalogCount: libraryStore.catalog.length,
      digitalNotesCount: libraryStore.digitalNotes.length
    }
  });
});

// GET Search Books Catalog
router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const dept = (req.query.dept || '').toUpperCase();
  
  let results = libraryStore.catalog;
  if (dept && dept !== 'ALL') {
    results = results.filter(b => b.dept.toUpperCase() === dept);
  }
  if (query) {
    results = results.filter(b => 
      b.title.toLowerCase().includes(query) || 
      b.author.toLowerCase().includes(query) || 
      b.isbn.includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  }

  res.status(200).json({
    success: true,
    data: results
  });
});

// GET Notes & PYQs
router.get('/notes', (req, res) => {
  const dept = (req.query.dept || '').toUpperCase();
  let results = libraryStore.digitalNotes;
  if (dept && dept !== 'ALL') {
    results = results.filter(n => n.dept.toUpperCase() === dept);
  }
  res.status(200).json({
    success: true,
    data: results
  });
});

// POST Renew Issued Book
router.post('/renew/:loanId', optionalAuth, (req, res) => {
  const { loanId } = req.params;
  const loan = libraryStore.loans.find(l => l.id === loanId || l.bookId === loanId);

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan record not found in issued list.'
    });
  }

  // Extend due date by 14 days
  const currentDue = new Date(loan.dueDate || Date.now());
  currentDue.setDate(currentDue.getDate() + 14);
  loan.dueDate = currentDue.toISOString().split('T')[0];
  loan.renewable = false;
  loan.status = 'ACTIVE';
  loan.fineAmount = 0;

  res.status(200).json({
    success: true,
    message: `Book "${loan.bookTitle}" successfully renewed until ${loan.dueDate}.`,
    data: loan
  });
});

// POST Reserve a book from catalog
router.post('/reserve/:bookId', optionalAuth, (req, res) => {
  const { bookId } = req.params;
  const book = libraryStore.catalog.find(b => b.id === bookId);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found in library catalog.'
    });
  }

  if (book.available <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Sorry, no copies are currently available for reservation.'
    });
  }

  book.available -= 1;

  res.status(200).json({
    success: true,
    message: `Book "${book.title}" successfully reserved! Please collect it from the BEC Central Library within 24 hours.`,
    data: book
  });
});

// -------------------------------------------------------------
// ADMIN / LIBRARIAN REST ENDPOINTS
// -------------------------------------------------------------

// GET Admin Dashboard Statistics
router.get('/admin/stats', (req, res) => {
  const totalTitles = libraryStore.catalog.length;
  const totalCopies = libraryStore.catalog.reduce((acc, b) => acc + (b.total || 0), 0);
  const availableCopies = libraryStore.catalog.reduce((acc, b) => acc + (b.available || 0), 0);
  const activeLoans = libraryStore.loans.filter(l => l.status === 'ACTIVE').length;
  const overdueLoans = libraryStore.loans.filter(l => l.status === 'OVERDUE').length;
  const totalFinePending = libraryStore.loans.reduce((acc, l) => acc + (l.fineAmount || 0), 0);
  const totalNotes = libraryStore.digitalNotes.length;

  res.status(200).json({
    success: true,
    data: {
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies: totalCopies - availableCopies,
      activeLoans,
      overdueLoans,
      totalFinePending,
      totalNotes,
      registeredPasses: 1248
    }
  });
});

// GET All Loan Records with optional filters
router.get('/admin/loans', (req, res) => {
  const { status, search } = req.query;
  let list = libraryStore.loans;

  if (status && status !== 'ALL') {
    list = list.filter(l => l.status === status.toUpperCase());
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(l => 
      l.studentName.toLowerCase().includes(q) ||
      l.rollNo.toLowerCase().includes(q) ||
      l.bookTitle.toLowerCase().includes(q) ||
      l.isbn.includes(q)
    );
  }

  res.status(200).json({
    success: true,
    data: list
  });
});

// GET Lookup Student Profile & Active Borrowings
router.get('/admin/student/:rollNo', (req, res) => {
  const rollNo = req.params.rollNo.trim().toUpperCase();
  const studentLoans = libraryStore.loans.filter(l => l.rollNo.toUpperCase() === rollNo && l.status !== 'RETURNED');
  const fineTotal = studentLoans.reduce((sum, l) => sum + (l.fineAmount || 0), 0);

  // Student directory metadata mock
  const studentProfiles = {
    "BEC26002": { name: "Rahul Jamana", dept: "Computer Science & Engg", sem: "6th Semester", regNo: "2101211042", email: "rahul@bec.ac.in", phone: "+91 98765 43210" },
    "BEC26001": { name: "Aditya Verma", dept: "Mechanical Engineering", sem: "6th Semester", regNo: "2101211011", email: "aditya@bec.ac.in", phone: "+91 98765 43211" },
    "2101211045": { name: "Priya Sharma", dept: "Computer Science & Engg", sem: "8th Semester", regNo: "2101211045", email: "priya@bec.ac.in", phone: "+91 98765 43212" },
    "2101211088": { name: "Soumya Ranjan Das", dept: "Computer Science & Engg", sem: "4th Semester", regNo: "2101211088", email: "soumya@bec.ac.in", phone: "+91 98765 43213" }
  };

  const info = studentProfiles[rollNo] || {
    name: "Student " + rollNo,
    dept: "B.Tech Engineering",
    sem: "Current Semester",
    regNo: rollNo,
    email: `${rollNo.toLowerCase()}@bec.ac.in`,
    phone: "+91 90000 00000"
  };

  res.status(200).json({
    success: true,
    data: {
      profile: info,
      borrowLimit: 3,
      currentHeld: studentLoans.length,
      canBorrow: studentLoans.length < 3 && fineTotal === 0,
      activeLoans: studentLoans,
      finePending: fineTotal
    }
  });
});

// POST Issue Book to Student
router.post('/admin/issue', (req, res) => {
  const { rollNo, studentName, bookId, dueDays = 14 } = req.body;

  if (!rollNo || !bookId) {
    return res.status(400).json({
      success: false,
      message: 'Student Roll No and Book ID are required.'
    });
  }

  const book = libraryStore.catalog.find(b => b.id === bookId || b.isbn === bookId);
  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found in library catalog stack.'
    });
  }

  if (book.available <= 0) {
    return res.status(400).json({
      success: false,
      message: `No available copies for "${book.title}". All ${book.total} copies are currently issued.`
    });
  }

  const studentActive = libraryStore.loans.filter(l => l.rollNo.toUpperCase() === rollNo.toUpperCase() && l.status !== 'RETURNED');
  if (studentActive.length >= 3) {
    return res.status(400).json({
      success: false,
      message: `Student ${rollNo} has reached maximum borrowing quota of 3 books.`
    });
  }

  // Calculate Dates
  const now = new Date();
  const due = new Date();
  due.setDate(due.getDate() + Number(dueDays));

  const newLoan = {
    id: `LN-${Date.now().toString().slice(-4)}`,
    rollNo: rollNo.toUpperCase(),
    studentName: studentName || `Student (${rollNo})`,
    bookId: book.id,
    bookTitle: book.title,
    author: book.author,
    isbn: book.isbn,
    dept: book.dept,
    issueDate: now.toISOString().split('T')[0],
    dueDate: due.toISOString().split('T')[0],
    status: 'ACTIVE',
    fineAmount: 0,
    renewable: true
  };

  book.available -= 1;
  libraryStore.loans.unshift(newLoan);

  res.status(201).json({
    success: true,
    message: `Book "${book.title}" successfully issued to ${rollNo}. Due date: ${newLoan.dueDate}.`,
    data: newLoan
  });
});

// POST Return Book
router.post('/admin/return', (req, res) => {
  const { loanId, waiveFine = false } = req.body;
  const loan = libraryStore.loans.find(l => l.id === loanId);

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan record not found.'
    });
  }

  // Increment available copies in catalog
  const book = libraryStore.catalog.find(b => b.id === loan.bookId);
  if (book && book.available < book.total) {
    book.available += 1;
  }

  const collectedFine = waiveFine ? 0 : loan.fineAmount;
  loan.status = 'RETURNED';
  loan.returnedAt = new Date().toISOString().split('T')[0];
  loan.fineAmount = 0;

  res.status(200).json({
    success: true,
    message: `Book "${loan.bookTitle}" marked as RETURNED. Fine collected: ₹${collectedFine}.`,
    data: loan
  });
});

// POST Add New Book to Catalog
router.post('/admin/add-book', (req, res) => {
  const { title, author, isbn, dept, category, shelf, total } = req.body;

  if (!title || !author || !isbn) {
    return res.status(400).json({
      success: false,
      message: 'Title, Author and ISBN are required.'
    });
  }

  const copies = parseInt(total, 10) || 5;
  const newBook = {
    id: `BK-${100 + libraryStore.catalog.length + 1}`,
    title,
    author,
    isbn,
    dept: dept || "CSE",
    category: category || "General Engineering",
    shelf: shelf || "Rack A-01",
    total: copies,
    available: copies
  };

  libraryStore.catalog.push(newBook);

  res.status(201).json({
    success: true,
    message: `Book "${title}" added to library catalog with ${copies} copies.`,
    data: newBook
  });
});

// DELETE Book from Catalog
router.delete('/admin/book/:id', (req, res) => {
  const { id } = req.params;
  const idx = libraryStore.catalog.findIndex(b => b.id === id);

  if (idx === -1) {
    return res.status(404).json({
      success: false,
      message: 'Book not found.'
    });
  }

  const removed = libraryStore.catalog.splice(idx, 1)[0];
  res.status(200).json({
    success: true,
    message: `Book "${removed.title}" removed from catalog.`,
    data: removed
  });
});

// POST Add Digital Note / PYQ
router.post('/admin/notes', (req, res) => {
  const { title, subject, code, dept, sem, year, link } = req.body;
  if (!title || !subject) {
    return res.status(400).json({
      success: false,
      message: 'Title and Subject are required.'
    });
  }

  const newNote = {
    id: `NOTE-${libraryStore.digitalNotes.length + 1}`,
    title,
    subject,
    code: code || "BPUT-RES",
    dept: dept || "CSE",
    sem: sem || "5th Sem",
    year: year || "2026",
    link: link || "#",
    downloads: 0
  };

  libraryStore.digitalNotes.unshift(newNote);

  res.status(201).json({
    success: true,
    message: `Resource "${title}" published successfully to Digital Repository.`,
    data: newNote
  });
});

// GET Check Clearance / No-Dues for Student
router.get('/admin/clearance/:rollNo', (req, res) => {
  const rollNo = req.params.rollNo.trim().toUpperCase();
  const unreturned = libraryStore.loans.filter(l => l.rollNo.toUpperCase() === rollNo && l.status !== 'RETURNED');
  const fineTotal = unreturned.reduce((sum, l) => sum + (l.fineAmount || 0), 0);

  const isCleared = unreturned.length === 0 && fineTotal === 0;

  res.status(200).json({
    success: true,
    data: {
      rollNo,
      isCleared,
      pendingBooksCount: unreturned.length,
      pendingFine: fineTotal,
      unreturnedBooks: unreturned,
      certificateId: isCleared ? `BEC/LIB/CLR/2026-${rollNo}` : null,
      clearanceDate: isCleared ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
      issuer: "Librarian & In-Charge, BEC Central Library"
    }
  });
});

module.exports = router;


