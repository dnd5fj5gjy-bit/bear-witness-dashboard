import { Router } from 'express';
import { getUpcomingPosts } from '../db.js';
import { getSchedulerStatus } from '../services/scheduler.js';

const router = Router();

const log = (msg) => console.log(`[${new Date().toISOString()}] [schedule] ${msg}`);

// GET /api/schedule/upcoming — All upcoming scheduled posts in chronological order
router.get('/upcoming', (req, res) => {
  try {
    const posts = getUpcomingPosts();
    res.json({ posts });
  } catch (err) {
    log(`Error fetching upcoming posts: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch upcoming posts' });
  }
});

// GET /api/schedule/status — Scheduler status
router.get('/status', (req, res) => {
  try {
    const status = getSchedulerStatus();
    res.json(status);
  } catch (err) {
    log(`Error fetching scheduler status: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch scheduler status' });
  }
});

export default router;
