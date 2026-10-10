const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');
const { wrap, badRequest, HttpError } = require('../errors');
const { sign, requireAuth } = require('../middleware/auth');

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, rollNumber: u.roll_number,
  department: u.department, createdAt: u.created_at
});

router.post('/register', wrap(async (req, res) => {
  const { name, email, password, rollNumber, department } = req.body;
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Name cannot be empty';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email must be valid';
  if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';
  if (!rollNumber || !rollNumber.trim()) errors.rollNumber = 'Roll number cannot be empty';
  if (!department || !department.trim()) errors.department = 'Department cannot be empty';
  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);

  const pool = getPool();
  const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (exists.length) throw new HttpError(409, 'Email is already registered');
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO users (name, email, password, roll_number, department) VALUES (?,?,?,?,?)',
    [name.trim(), email.toLowerCase(), hash, rollNumber.trim(), department.trim()]);
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [r.insertId]);
  res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw badRequest('Email and password are required');
  const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new HttpError(401, 'Invalid login credentials');
  res.json({ token: sign(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const [rows] = await getPool().query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) throw new HttpError(401, 'User no longer exists');
  res.json(publicUser(rows[0]));
}));

module.exports = router;
