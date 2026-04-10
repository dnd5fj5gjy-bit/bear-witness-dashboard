import { Router } from 'express';
import { getAll, getById, getByField, upsert, remove } from '../dashboardDb.js';

const router = Router();
const TABLE = 'dash_strategies';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/strategies — list all, optional ?clientId= filter
router.get('/', (req, res) => {
  try {
    const { clientId } = req.query;
    const items = clientId
      ? getByField(TABLE, 'client_id', clientId)
      : getAll(TABLE);
    res.json(items);
  } catch (err) {
    console.error('GET /api/strategies error:', err.message);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// GET /api/strategies/:id — get one
router.get('/:id', (req, res) => {
  try {
    const item = getById(TABLE, req.params.id);
    if (!item) return res.status(404).json({ error: 'Strategy not found' });
    res.json(item);
  } catch (err) {
    console.error(`GET /api/strategies/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

// POST /api/strategies — create
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.createdAt) data.createdAt = Date.now();
    if (!data.updatedAt) data.updatedAt = Date.now();
    upsert(TABLE, data.id, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/strategies error:', err.message);
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// PUT /api/strategies/:id — update
router.put('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Strategy not found' });
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: Date.now() };
    upsert(TABLE, req.params.id, updated);
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/strategies/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

// DELETE /api/strategies/:id — delete
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Strategy not found' });
    remove(TABLE, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/strategies/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

export default router;
