import { Router } from 'express';
import { getSettings, updateSettings } from '../dashboardDb.js';

const router = Router();

// GET /api/settings — get all settings as an object
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings — merge updates into settings
router.put('/', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    updateSettings(data);
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    console.error('PUT /api/settings error:', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
