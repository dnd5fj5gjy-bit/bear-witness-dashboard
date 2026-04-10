import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db.js';
import { initDashboardTables } from './dashboardDb.js';
import { apiKeyAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import accountsRoutes from './routes/accounts.js';
import postsRoutes from './routes/posts.js';
import scheduleRoutes from './routes/schedule.js';
import dashClientsRoutes from './routes/dashClients.js';
import dashCampaignsRoutes from './routes/dashCampaigns.js';
import dashPostsRoutes from './routes/dashPosts.js';
import dashResearchRoutes from './routes/dashResearch.js';
import dashStrategiesRoutes from './routes/dashStrategies.js';
import dashProposalsRoutes from './routes/dashProposals.js';
import dashActivityRoutes from './routes/dashActivity.js';
import dashSettingsRoutes from './routes/dashSettings.js';
import { startScheduler } from './services/scheduler.js';
import { startTokenRefreshJob } from './services/tokenRefresh.js';
import { startBackupJob } from './backup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5182', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — allow the frontend origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from GitHub Pages, localhost, trycloudflare tunnels, and no-origin (server-to-server)
    if (!origin) return callback(null, true);
    if (
      origin.includes('github.io') ||
      origin.includes('localhost') ||
      origin.includes('trycloudflare.com') ||
      origin === FRONTEND_URL
    ) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for now — API key protects the data
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// JSON body parser (50MB limit for large strategy/proposal content)
app.use(express.json({ limit: '50mb' }));
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

// Health check (no auth needed) — both /health and /api/health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
app.get('/api/health', (req, res) => {
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

// Dashboard data routes (protected by API key)
app.use('/api/clients', apiKeyAuth, dashClientsRoutes);
app.use('/api/campaigns', apiKeyAuth, dashCampaignsRoutes);
app.use('/api/content-posts', apiKeyAuth, dashPostsRoutes);
app.use('/api/research', apiKeyAuth, dashResearchRoutes);
app.use('/api/strategies', apiKeyAuth, dashStrategiesRoutes);
app.use('/api/proposals', apiKeyAuth, dashProposalsRoutes);
app.use('/api/activity', apiKeyAuth, dashActivityRoutes);
app.use('/api/settings', apiKeyAuth, dashSettingsRoutes);

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
  initDashboardTables();

  // Start the server
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Bear Witness Dashboard server running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Frontend URL: ${FRONTEND_URL}`);
    console.log(`[${new Date().toISOString()}] API Key required: ${!!process.env.API_KEY}`);
  });

  // Start background jobs
  startScheduler();
  startTokenRefreshJob();
  startBackupJob();
}

start();

export default app;
