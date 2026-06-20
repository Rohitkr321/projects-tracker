require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

const { sequelize } = require('./src/models');
const routes = require('./src/routes');
const { errorHandler, notFound } = require('./src/middleware/errorHandler.middleware');
const { apiLimiter } = require('./src/middleware/rateLimiter.middleware');
const socketService = require('./src/services/socket.service');
const { startDueDateReminderJob } = require('./src/jobs/dueDateReminder.job');

const app = express();
const httpServer = http.createServer(app);

socketService.init(httpServer);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Build allowed origins: hardcoded production domains + anything in FRONTEND_URL env var
const ALLOWED_ORIGINS = [
  // ── Production domains (always allowed) ──
  'https://trackerweb.generalaeronautics.com',
  'http://trackerweb.generalaeronautics.com',
  'https://tracker.generalaeronautics.com',
  'http://tracker.generalaeronautics.com',
  // ── Local dev ──
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  'http://localhost:19000',
  // ── Extra origins from .env (comma-separated) ──
  ...(process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // some browsers (IE11) choke on 204
};

// Handle preflight OPTIONS before any other middleware
app.options('/{*path}', cors(corsOptions));
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'GA Jira API' }));

app.use('/api/v1', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized');
    httpServer.listen(PORT, () => {
      console.log(`GA Jira API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Socket.io initialized`);
      startDueDateReminderJob();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
