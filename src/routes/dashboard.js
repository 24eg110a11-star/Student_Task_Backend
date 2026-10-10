const router = require('express').Router();
const { getPool } = require('../db');
const { wrap } = require('../errors');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, wrap(async (req, res) => {
  const [[s]] = await getPool().query(
    `SELECT COUNT(*) total,
      COALESCE(SUM(status='PENDING'),0) pending,
      COALESCE(SUM(status='IN_PROGRESS'),0) inProgress,
      COALESCE(SUM(status='COMPLETED'),0) completed,
      COALESCE(SUM(priority='HIGH' AND status<>'COMPLETED'),0) high,
      COALESCE(SUM(status<>'COMPLETED' AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)),0) upcoming
     FROM tasks WHERE user_id = ?`, [req.user.id]);
  const total = Number(s.total), completed = Number(s.completed);
  res.json({
    totalTasks: total,
    pendingTasks: Number(s.pending),
    inProgressTasks: Number(s.inProgress),
    completedTasks: completed,
    highPriorityTasks: Number(s.high),
    upcomingTasks: Number(s.upcoming),
    completionPercentage: total ? Math.round((completed / total) * 100) : 0
  });
}));
module.exports = router;
