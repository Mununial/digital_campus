const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/authGateway');

const libraryData = {
  issuedBooks: [
    {
      id: "BK-101",
      title: "Database Management System",
      author: "R. Elmasri, S. Navathe",
      isbn: "978-0133970777",
      issueDate: "14 Sep 2026",
      dueDate: "28 Sep 2026",
      renewable: true,
      fineAmount: 0
    },
    {
      id: "BK-102",
      title: "Java Programming",
      author: "James Gosling",
      isbn: "978-0134685991",
      issueDate: "16 Sep 2026",
      dueDate: "30 Sep 2026",
      renewable: true,
      fineAmount: 0
    }
  ],
  catalog: [
    { id: "CAT-1", title: "Data Structures Using C", author: "Reema Thareja", available: 8, total: 15 },
    { id: "CAT-2", title: "Operating System Concepts", author: "Silberschatz, Galvin", available: 5, total: 12 },
    { id: "CAT-3", title: "Computer Networks", author: "Andrew S. Tanenbaum", available: 11, total: 20 },
    { id: "CAT-4", title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell", available: 4, total: 10 }
  ],
  rules: [
    "Students can issue up to 3 books at a time for 14 days.",
    "A fine of ₹2 per day is levied on overdue books.",
    "Reference books and journals must be read inside the reading hall.",
    "Digital library terminals are available between 8:00 AM and 8:00 PM."
  ]
};

// GET Library Overview (Issued books, reservations, rules)
router.get('/', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      issuedBooks: libraryData.issuedBooks,
      reservationsCount: 0,
      finePending: 0,
      rules: libraryData.rules
    }
  });
});

// GET Search Books Catalog
router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const results = query
    ? libraryData.catalog.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query))
    : libraryData.catalog;

  res.status(200).json({
    success: true,
    data: results
  });
});

// POST Renew Issued Book
router.post('/renew/:bookId', optionalAuth, (req, res) => {
  const { bookId } = req.params;
  const book = libraryData.issuedBooks.find(b => b.id === bookId);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book record not found in issued list.'
    });
  }

  // Extend due date by 14 days
  book.dueDate = "14 Oct 2026";
  book.renewable = false;

  res.status(200).json({
    success: true,
    message: `Book "${book.title}" successfully renewed until ${book.dueDate}.`,
    data: book
  });
});

module.exports = router;
