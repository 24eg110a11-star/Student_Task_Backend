class HttpError extends Error {
  constructor(status, message, errors) { super(message); this.status = status; this.errors = errors; }
}
const notFound = (m = 'Resource not found') => new HttpError(404, m);
const badRequest = (m = 'Bad request', errors) => new HttpError(400, m, errors);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
    status,
    errors: err.errors,
    timestamp: new Date().toISOString().slice(0, 19)
  });
}
module.exports = { HttpError, notFound, badRequest, wrap, errorHandler };
