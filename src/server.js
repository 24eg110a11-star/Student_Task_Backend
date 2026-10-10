require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const { errorHandler, HttpError } = require('./errors');

const app = express();
const origins = (process.env.CLIENT_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({ origin: origins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use((req, res, next) => next(new HttpError(404, 'Endpoint not found')));
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
initDb()
  .then(() => app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`)))
  .catch((e) => { console.error('Database connection failed:', e.message); process.exit(1); });
