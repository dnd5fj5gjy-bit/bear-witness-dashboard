import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  createPost,
  getPostById,
  getAllPosts,
  updatePost,
  updatePostStatus,
  deletePost,
  getAccountById,
} from '../db.js';
import { publishPost } from '../services/publisher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router = Router();

const log = (msg) => console.log(`[${new Date().toISOString()}] [posts] ${msg}`);

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/**
 * Process an uploaded image — resize if too large, strip EXIF, convert to JPEG.
 */
async function processImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    // Only process if it's an image and larger than 4096px on any side
    if (metadata.width > 4096 || metadata.height > 4096) {
      const processed = filePath.replace(/(\.\w+)$/, '_processed$1');
      await sharp(filePath)
        .resize(4096, 4096, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(processed);
      // Replace original with processed
      fs.unlinkSync(filePath);
      fs.renameSync(processed, filePath);
      log(`Image resized: ${path.basename(filePath)}`);
    }
  } catch (err) {
    // Not an image or sharp can't process it — that's fine, skip
    log(`Image processing skipped for ${path.basename(filePath)}: ${err.message}`);
  }
}

// POST /api/posts/schedule — Schedule a new post
router.post('/schedule', upload.single('media'), async (req, res) => {
  try {
    const { accountId, caption, hashtags, scheduledAt, mediaType } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required' });
    }

    // Validate account exists
    const account = getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledAt date format' });
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'scheduledAt must be in the future' });
    }

    let mediaPath = null;
    let resolvedMediaType = mediaType || 'text';

    if (req.file) {
      mediaPath = req.file.path;
      // Auto-detect media type from mimetype if not provided
      if (!mediaType) {
        resolvedMediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      }
      // Process images
      if (resolvedMediaType === 'image') {
        await processImage(mediaPath);
      }
    }

    // Build full caption with hashtags
    const fullCaption = hashtags
      ? `${caption || ''}\n\n${hashtags}`.trim()
      : (caption || '');

    const postId = createPost({
      accountId: Number(accountId),
      caption: fullCaption,
      mediaPath,
      mediaType: resolvedMediaType,
      hashtags: hashtags || null,
      scheduledAt: scheduledDate.toISOString(),
    });

    log(`Post scheduled (id=${postId}) for ${scheduledDate.toISOString()} on account ${accountId}`);

    const post = getPostById(postId);
    res.status(201).json({ post });
  } catch (err) {
    log(`Error scheduling post: ${err.message}`);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// GET /api/posts — List posts
router.get('/', (req, res) => {
  try {
    const { status, accountId, from, to } = req.query;
    const posts = getAllPosts({
      status: status || undefined,
      accountId: accountId ? Number(accountId) : undefined,
      from: from || undefined,
      to: to || undefined,
    });
    res.json({ posts });
  } catch (err) {
    log(`Error listing posts: ${err.message}`);
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// GET /api/posts/:id — Get single post
router.get('/:id', (req, res) => {
  try {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ post });
  } catch (err) {
    log(`Error fetching post ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// PUT /api/posts/:id — Update a pending post
router.put('/:id', upload.single('media'), async (req, res) => {
  try {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending posts can be updated' });
    }

    const updates = {};
    if (req.body.caption !== undefined) updates.caption = req.body.caption;
    if (req.body.hashtags !== undefined) updates.hashtags = req.body.hashtags;
    if (req.body.mediaType !== undefined) updates.mediaType = req.body.mediaType;

    if (req.body.scheduledAt) {
      const scheduledDate = new Date(req.body.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduledAt date format' });
      }
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'scheduledAt must be in the future' });
      }
      updates.scheduledAt = scheduledDate.toISOString();
    }

    if (req.file) {
      // Remove old media file if it exists
      if (post.media_path && fs.existsSync(post.media_path)) {
        fs.unlinkSync(post.media_path);
      }
      updates.mediaPath = req.file.path;
      if (!updates.mediaType) {
        updates.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      }
      if (updates.mediaType === 'image') {
        await processImage(req.file.path);
      }
    }

    // Rebuild caption with hashtags if both provided
    if (updates.caption !== undefined && updates.hashtags !== undefined) {
      updates.caption = updates.hashtags
        ? `${updates.caption}\n\n${updates.hashtags}`.trim()
        : updates.caption;
    }

    updatePost(req.params.id, updates);
    const updated = getPostById(req.params.id);
    log(`Post updated (id=${req.params.id})`);
    res.json({ post: updated });
  } catch (err) {
    log(`Error updating post ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/posts/:id — Delete/cancel a pending post
router.delete('/:id', (req, res) => {
  try {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending posts can be deleted' });
    }

    // Remove media file if exists
    if (post.media_path && fs.existsSync(post.media_path)) {
      fs.unlinkSync(post.media_path);
    }

    deletePost(req.params.id);
    log(`Post deleted (id=${req.params.id})`);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    log(`Error deleting post ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/posts/:id/publish-now — Immediately publish a pending post
router.post('/:id/publish-now', async (req, res) => {
  try {
    const post = getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending posts can be published' });
    }

    log(`Publishing post immediately (id=${req.params.id})`);
    const result = await publishPost(post.id);

    if (result.success) {
      res.json({ success: true, platformPostId: result.platformPostId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    log(`Error publishing post ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

export default router;
