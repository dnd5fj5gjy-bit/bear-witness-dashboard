import { Router } from 'express';
import { getAll, getById, getByField, upsert, remove } from '../dashboardDb.js';

const router = Router();
const TABLE = 'dash_campaigns';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/campaigns — list all, optional ?clientId= filter
router.get('/', (req, res) => {
  try {
    const { clientId } = req.query;
    const campaigns = clientId
      ? getByField(TABLE, 'client_id', clientId)
      : getAll(TABLE);
    res.json(campaigns);
  } catch (err) {
    console.error('GET /api/campaigns error:', err.message);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id — get one
router.get('/:id', (req, res) => {
  try {
    const campaign = getById(TABLE, req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    console.error(`GET /api/campaigns/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns — create
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.createdAt) data.createdAt = Date.now();
    if (!data.updatedAt) data.updatedAt = Date.now();
    upsert(TABLE, data.id, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/campaigns error:', err.message);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id — update
router.put('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: Date.now() };
    upsert(TABLE, req.params.id, updated);
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/campaigns/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id — delete
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    remove(TABLE, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/campaigns/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
