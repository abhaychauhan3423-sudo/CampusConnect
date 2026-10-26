const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
  // Brute-force protection on login/register; general limit on the rest of the API.
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { success: false, message: 'Too many attempts. Try again later.' } }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, message: { success: false, message: 'Too many requests.' } }));
}

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
