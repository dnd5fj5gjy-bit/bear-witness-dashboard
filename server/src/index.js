import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db.js';
import { apiKeyAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import accountsRoutes from './routes/accounts.js';
import postsRoutes from './routes/posts.js';
import scheduleRoutes from './routes/schedule.js';
import { startScheduler } from './services/scheduler.js';
import { startTokenRefreshJob } from './services/tokenRefresh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5181', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — allow the frontend origin
app.use(cors({
  origin: [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// JSON body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (needed for Instagram image_url publishing)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Skip noisy health check logs
    if (req.path === '/health') return;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check (no auth needed)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// OAuth routes (no API key needed — browser redirects)
app.use('/auth', authRoutes);

// API routes (protected by API key in production)
app.use('/api/accounts', apiKeyAuth, accountsRoutes);
app.use('/api/posts', apiKeyAuth, postsRoutes);
app.use('/api/schedule', apiKeyAuth, scheduleRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 100MB)' });
  }
  if (err.message?.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function start() {
  // Initialize database
  initDatabase();

  // Start the server
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Bear Witness Dashboard server running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Frontend URL: ${FRONTEND_URL}`);
    console.log(`[${new Date().toISOString()}] API Key required: ${!!process.env.API_KEY}`);
  });

  // Start background jobs
  startScheduler();
  startTokenRefreshJob();
}

start();

export default app;
