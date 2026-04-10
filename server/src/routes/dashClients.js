import { Router } from 'express';
import { getAll, getById, upsert, remove, removeByField } from '../dashboardDb.js';

const router = Router();
const TABLE = 'dash_clients';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/clients — list all clients
router.get('/', (req, res) => {
  try {
    const clients = getAll(TABLE);
    res.json(clients);
  } catch (err) {
    console.error('GET /api/clients error:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id — get one client
router.get('/:id', (req, res) => {
  try {
    const client = getById(TABLE, req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    console.error(`GET /api/clients/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/clients — create client
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.createdAt) data.createdAt = Date.now();
    if (!data.updatedAt) data.updatedAt = Date.now();
    upsert(TABLE, data.id, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/clients error:', err.message);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/clients/:id — update client
router.put('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: Date.now() };
    upsert(TABLE, req.params.id, updated);
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/clients/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/clients/:id — delete client + cascade
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    // Cascade delete associated data
    removeByField('dash_campaigns', 'client_id', req.params.id);
    removeByField('dash_posts', 'client_id', req.params.id);
    removeByField('dash_research', 'client_id', req.params.id);
    removeByField('dash_strategies', 'client_id', req.params.id);
    removeByField('dash_proposals', 'client_id', req.params.id);

    remove(TABLE, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/clients/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
