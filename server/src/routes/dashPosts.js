import { Router } from 'express';
import { getAll, getById, getByField, upsert, remove } from '../dashboardDb.js';

const router = Router();
const TABLE = 'dash_posts';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// GET /api/content-posts — list all, optional ?clientId= and ?campaignId= filters
router.get('/', (req, res) => {
  try {
    const { clientId, campaignId } = req.query;
    let posts;
    if (campaignId) {
      posts = getByField(TABLE, 'campaign_id', campaignId);
    } else if (clientId) {
      posts = getByField(TABLE, 'client_id', clientId);
    } else {
      posts = getAll(TABLE);
    }
    res.json(posts);
  } catch (err) {
    console.error('GET /api/content-posts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/content-posts/:id — get one
router.get('/:id', (req, res) => {
  try {
    const post = getById(TABLE, req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(`GET /api/content-posts/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/content-posts — create
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = genId();
    if (!data.createdAt) data.createdAt = Date.now();
    if (!data.updatedAt) data.updatedAt = Date.now();
    upsert(TABLE, data.id, data);
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/content-posts error:', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/content-posts/:id — update
router.put('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: Date.now() };
    upsert(TABLE, req.params.id, updated);
    res.json(updated);
  } catch (err) {
    console.error(`PUT /api/content-posts/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/content-posts/:id — delete
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(TABLE, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    remove(TABLE, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/content-posts/${req.params.id} error:`, err.message);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
