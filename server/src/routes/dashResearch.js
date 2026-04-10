import { Router } from 'express';
import { getAll, getById, getByField, upsert, remove } from '../dashboardDb.js';

const router = Router();
const TABLE = 'dash_research';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/research — list all, optional ?clientId= filter
router.get('/', (req, res) => {
  try {
    const { clientId } = req.query;
    const items = clientId
      ? getByField(TABLE, 'client_id', clientId)
      : getAll(TABLE);
    res.json(items);
  } catch (err) {
    console.error('GET /api/research error:', err.message);
    res.status(500).json({ error: 'Failed to fetch research' });
  }
});

// GET /api/research/:id — get one
router.get('/:id', (req, res) => {
  try {
    const item = getById(TABLE, req.params.id);
    if (!item) return res.status(404).json({ error: 'Research not found' });
    res.json(item);
  } catch (err) {
    console.error(`GET /api/research/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to fetch research' });
  }
});

// POST /api/research — create
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.createdAt) data.createdAt = Date.now();
    if (!data.updatedAt) data.updatedAt = Date.now();
    upsert(TABLE, data.id, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/research error:', err.message);
    res.status(500).json({ error: 'Failed to create research' });
  }
});

// PUT /api/research/:id — update
router.put('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Research not found' });
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: Date.now() };
    upsert(TABLE, req.params.id, updated);
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/research/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to update research' });
  }
});

// DELETE /api/research/:id — delete
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Research not found' });
    remove(TABLE, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/research/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to delete research' });
  }
});

export default router;
