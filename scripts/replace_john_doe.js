const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../Hostel Management/backend/src/config/db.js');
let content = fs.readFileSync(target, 'utf8');
content = content.split("'John Doe'").join("'Student'");
fs.writeFileSync(target, content, 'utf8');
console.log('Successfully replaced all John Doe occurrences in db.js');
