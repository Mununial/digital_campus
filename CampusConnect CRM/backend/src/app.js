const express = require('express');
const cors = require('cors');
const leadRoutes = require('./routes/leadRoutes');
const authRoutes = require('./routes/authRoutes');
const automationRoutes = require('./routes/automationRoutes');
const emailRoutes = require('./routes/emailRoutes');
const aiRoutes = require('./routes/aiRoutes');
const publicRoutes = require('./routes/publicRoutes');
const callRoutes = require('./routes/callRoutes');



const vapiRoutes = require('./routes/vapiRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vapi', vapiRoutes); // Open webhook route

app.use('/api/leads', leadRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/calls', callRoutes);






// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
