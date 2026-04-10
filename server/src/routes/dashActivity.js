import { Router } from 'express';
import { getActivityFeed, upsert } from '../dashboardDb.js';

const router = Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/activity — list activity feed (last 200), optional ?clientId= filter
router.get('/', (req, res) => {
  try {
    const { clientId } = req.query;
    const items = getActivityFeed(200, clientId || null);
    res.json(items);
  } catch (err) {
    console.error('GET /api/activity error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// POST /api/activity — add entry
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.timestamp) data.timestamp = Date.now();
    upsert('dash_activity_feed', null, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/activity error:', err.message);
    res.status(500).json({ error: 'Failed to add activity entry' });
  }
});

export default router;
