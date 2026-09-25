const mysql = require('C:/Users/munun/Downloads/COLLEGE ERP/COLLEGE ERP/campus-portal/node_modules/mysql2/promise');
const bcrypt = require('C:/Users/munun/Downloads/COLLEGE ERP/COLLEGE ERP/campus-portal/node_modules/bcryptjs');

(async () => {
  const conn = await mysql.createConnection({
    host: 'srv1334.hstgr.io',
    user: 'u847513759_ERP_COLLEGE',
    password: 'Ayushtech@26',
    database: 'u847513759_ERP_COLLEGE',
    port: 3306
  });

  const [u] = await conn.query("SELECT id, username, email, password_hash FROM users WHERE username = 'BEC26306'");
  console.log('User BEC26306:', u);

  const [s] = await conn.query("SELECT id, user_id, roll_number, dob FROM students WHERE roll_number = 'BEC26306'");
  console.log('Student BEC26306:', s);

  if (u.length > 0) {
    const isAyush = await bcrypt.compare('Ayushtech@26', u[0].password_hash);
    console.log('Password is Ayushtech@26?', isAyush);
    if (s.length > 0) {
      const dobStr = s[0].dob instanceof Date ? s[0].dob.toISOString().split('T')[0] : String(s[0].dob);
      const isDob = await bcrypt.compare(dobStr, u[0].password_hash);
      console.log('Password is DOB?', isDob, 'DOB:', dobStr);
    }
  }

  await conn.end();
})();
