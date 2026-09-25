const app = require('./app');
const scheduler = require('./utils/scheduler');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Initialize Automation Scheduler
scheduler.init();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
});
// Server reloaded

