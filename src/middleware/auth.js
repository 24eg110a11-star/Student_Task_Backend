const jwt = require('jsonwebtoken');
const { HttpError } = require('../errors');
const SECRET = process.env.JWT_SECRET || 'dev_secret';

const sign = (user) => jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' });

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Authentication required'));
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}
module.exports = { sign, requireAuth };
