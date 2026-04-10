import { Router } from 'express';
import { getAll, getById, getByField, upsert, remove } from '../dashboardDb.js';

const router = Router();
const TABLE = 'dash_proposals';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/proposals — list all, optional ?clientId= and ?strategyId= filters
router.get('/', (req, res) => {
  try {
    const { clientId, strategyId } = req.query;
    let items;
    if (strategyId) {
      items = getByField(TABLE, 'strategy_id', strategyId);
    } else if (clientId) {
      items = getByField(TABLE, 'client_id', clientId);
    } else {
      items = getAll(TABLE);
    }
    res.json(items);
  } catch (err) {
    console.error('GET /api/proposals error:', err.message);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/:id — get one
router.get('/:id', (req, res) => {
  try {
    const item = getById(TABLE, req.params.id);
    if (!item) return res.status(404).json({ error: 'Proposal not found' });
    res.json(item);
  } catch (err) {
    console.error(`GET /api/proposals/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/proposals — create
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.createdAt) data.createdAt = Date.now();
    if (!data.updatedAt) data.updatedAt = Date.now();
    upsert(TABLE, data.id, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/proposals error:', err.message);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// PUT /api/proposals/:id — update
router.put('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Proposal not found' });
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: Date.now() };
    upsert(TABLE, req.params.id, updated);
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/proposals/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// DELETE /api/proposals/:id — delete
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Proposal not found' });
    remove(TABLE, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/proposals/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

export default router;
