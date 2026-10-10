const router = require('express').Router();
const { getPool } = require('../db');
const { wrap, badRequest, notFound } = require('../errors');
const { requireAuth } = require('../middleware/auth');

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

const toDto = (t) => ({
  id: t.id, title: t.title, subject: t.subject, description: t.description,
  priority: t.priority, dueDate: t.due_date, status: t.status,
  createdAt: t.created_at, updatedAt: t.updated_at
});

function validate(body) {
  const e = {};
  if (!body.title || !String(body.title).trim()) e.title = 'Title is required';
  if (!body.subject || !String(body.subject).trim()) e.subject = 'Subject is required';
  if (!body.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) e.dueDate = 'Due date is required (YYYY-MM-DD)';
  if (!PRIORITIES.includes(body.priority)) e.priority = 'Priority must be LOW, MEDIUM or HIGH';
  if (!STATUSES.includes(body.status)) e.status = 'Status must be PENDING, IN_PROGRESS or COMPLETED';
  if (Object.keys(e).length) throw badRequest('Validation failed', e);
}

const SORTS = {
  dueDate: 'due_date',
  title: 'title',
  createdAt: 'created_at',
  priority: "FIELD(priority,'LOW','MEDIUM','HIGH')",
  status: "FIELD(status,'PENDING','IN_PROGRESS','COMPLETED')"
};

async function findOwned(id, userId) {
  const [rows] = await getPool().query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  if (!rows.length) throw notFound('Task not found');
  return rows[0];
}

router.use(requireAuth);

// GET /api/tasks, /api/tasks/search?keyword=, /api/tasks/filter?status=&priority=
const list = wrap(async (req, res) => {
  const { keyword, status, priority, subject, dueDate, upcoming, sortBy = 'createdAt', order = 'desc' } = req.query;
  const where = ['user_id = ?'];
  const params = [req.user.id];
  if (keyword) {
    where.push('(title LIKE ? OR subject LIKE ? OR description LIKE ?)');
    const k = `%${keyword}%`;
    params.push(k, k, k);
  }
  if (status) { where.push('status = ?'); params.push(status); }
  if (priority) { where.push('priority = ?'); params.push(priority); }
  if (subject) { where.push('subject = ?'); params.push(subject); }
  if (dueDate) { where.push('due_date = ?'); params.push(dueDate); }
  if (upcoming === 'true') where.push("status <> 'COMPLETED' AND due_date >= CURDATE()");
  const col = SORTS[sortBy] || SORTS.createdAt;
  const dir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await getPool().query(
    `SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY ${col} ${dir}, id DESC`, params);
  res.json(rows.map(toDto));
});
router.get('/', list);
router.get('/search', list);
router.get('/filter', list);

router.get('/subjects', wrap(async (req, res) => {
  const [rows] = await getPool().query(
    'SELECT DISTINCT subject FROM tasks WHERE user_id = ? ORDER BY subject', [req.user.id]);
  res.json(rows.map((r) => r.subject));
}));

router.get('/:id', wrap(async (req, res) => res.json(toDto(await findOwned(req.params.id, req.user.id)))));

router.post('/', wrap(async (req, res) => {
  validate(req.body);
  const b = req.body;
  const [r] = await getPool().query(
    'INSERT INTO tasks (title, subject, description, priority, due_date, status, user_id) VALUES (?,?,?,?,?,?,?)',
    [b.title.trim(), b.subject.trim(), b.description || '', b.priority, b.dueDate, b.status, req.user.id]);
  res.status(201).json(toDto(await findOwned(r.insertId, req.user.id)));
}));

router.put('/:id', wrap(async (req, res) => {
  await findOwned(req.params.id, req.user.id);
  validate(req.body);
  const b = req.body;
  await getPool().query(
    'UPDATE tasks SET title=?, subject=?, description=?, priority=?, due_date=?, status=? WHERE id=? AND user_id=?',
    [b.title.trim(), b.subject.trim(), b.description || '', b.priority, b.dueDate, b.status, req.params.id, req.user.id]);
  res.json(toDto(await findOwned(req.params.id, req.user.id)));
}));

router.patch('/:id/status', wrap(async (req, res) => {
  await findOwned(req.params.id, req.user.id);
  if (!STATUSES.includes(req.body.status)) throw badRequest('Invalid status');
  await getPool().query('UPDATE tasks SET status=? WHERE id=? AND user_id=?',
    [req.body.status, req.params.id, req.user.id]);
  res.json(toDto(await findOwned(req.params.id, req.user.id)));
}));

router.delete('/:id', wrap(async (req, res) => {
  await findOwned(req.params.id, req.user.id);
  await getPool().query('DELETE FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ message: 'Task deleted successfully' });
}));

module.exports = router;
