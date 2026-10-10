// Creates a demo user (demo@student.com / password123) with sample tasks.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb, getPool } = require('./db');

(async () => {
  await initDb();
  const pool = getPool();
  const [ex] = await pool.query('SELECT id FROM users WHERE email = ?', ['demo@student.com']);
  if (ex.length) { console.log('Demo user already exists.'); return process.exit(0); }
  const hash = await bcrypt.hash('password123', 10);
  const [u] = await pool.query(
    'INSERT INTO users (name,email,password,roll_number,department) VALUES (?,?,?,?,?)',
    ['Gannu Siddartha Reddy', 'demo@student.com', hash, '24EG110A11', 'CSE-DS(A)']);
  const tasks = [
    ['Java Spring Boot Project', 'Java', 'Complete the Spring Boot assignment.', 'HIGH', '2026-10-15', 'IN_PROGRESS'],
    ['DBMS Assignment', 'DBMS', 'Normalization and SQL queries.', 'MEDIUM', '2026-10-18', 'PENDING'],
    ['React Laboratory', 'Web Technologies', 'Build a small React app.', 'LOW', '2026-10-10', 'COMPLETED'],
    ['Data Science Presentation', 'Data Science', 'Prepare 10 slides.', 'HIGH', '2026-10-08', 'PENDING']
  ];
  for (const t of tasks)
    await pool.query('INSERT INTO tasks (title,subject,description,priority,due_date,status,user_id) VALUES (?,?,?,?,?,?,?)', [...t, u.insertId]);
  console.log('Seeded demo user: demo@student.com / password123');
  process.exit(0);
})();
