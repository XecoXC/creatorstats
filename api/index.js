require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Security & logging
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Raw body for Stripe webhooks (must come before express.json)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
}));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Routes
app.use('/api/config', require('./config/routes'));
app.use('/api/auth', require('./auth/routes'));
app.use('/api/ai', require('./ai/routes'));
app.use('/api/user', require('./user/routes'));
app.use('/api/platforms', require('./platforms/routes'));
app.use('/api/stripe', require('./stripe/routes'));

// Serve frontend (dev + production)
app.use(express.static(path.join(__dirname, '..')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`CreatorStats API running on http://localhost:${PORT}`));
}

module.exports = app;
