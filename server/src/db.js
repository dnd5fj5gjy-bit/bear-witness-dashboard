import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'bear-witness.db');

// Ensure data directory exists
import fs from 'node:fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { verbose: null });

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Token encryption helpers (AES-256-GCM)
// ---------------------------------------------------------------------------

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function deriveKey() {
  const secret = process.env.JWT_SECRET || 'bearwitness-secret-change-me';
  return crypto.scryptSync(secret, 'bear-witness-salt', 32);
}

export function encryptToken(plaintext) {
  if (!plaintext) return null;
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Store as iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptToken(encryptedStr) {
  if (!encryptedStr) return null;
  try {
    const [ivHex, authTagHex, ciphertext] = encryptedStr.split(':');
    const key = deriveKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Token decryption failed:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Schema initialization
// ---------------------------------------------------------------------------

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL CHECK(platform IN ('meta', 'linkedin', 'twitter', 'tiktok', 'youtube')),
      platform_user_id TEXT NOT NULL,
      name TEXT,
      username TEXT,
      profile_url TEXT,
      avatar_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at INTEGER,
      page_id TEXT,
      page_access_token TEXT,
      ig_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform, platform_user_id)
    );

    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      caption TEXT,
      media_path TEXT,
      media_type TEXT CHECK(media_type IN ('image', 'video', 'carousel', 'text')),
      hashtags TEXT,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'publishing', 'published', 'failed')),
      error_message TEXT,
      platform_post_id TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      reach INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      link_clicks INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON scheduled_posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON scheduled_posts(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_posts_account ON scheduled_posts(account_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_post ON post_analytics(post_id);
  `);

  console.log(`[${new Date().toISOString()}] Database initialized at ${DB_PATH}`);
}

// ---------------------------------------------------------------------------
// Account helpers
// ---------------------------------------------------------------------------

export function createAccount({ platform, platformUserId, name, username, profileUrl, avatarUrl, accessToken, refreshToken, tokenExpiresAt, pageId, pageAccessToken, igUserId }) {
  const stmt = db.prepare(`
    INSERT INTO accounts (platform, platform_user_id, name, username, profile_url, avatar_url, access_token, refresh_token, token_expires_at, page_id, page_access_token, ig_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform, platform_user_id) DO UPDATE SET
      name = excluded.name,
      username = excluded.username,
      profile_url = excluded.profile_url,
      avatar_url = excluded.avatar_url,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      page_id = excluded.page_id,
      page_access_token = excluded.page_access_token,
      ig_user_id = excluded.ig_user_id,
      updated_at = datetime('now')
  `);

  const result = stmt.run(
    platform,
    platformUserId,
    name || null,
    username || null,
    profileUrl || null,
    avatarUrl || null,
    encryptToken(accessToken),
    encryptToken(refreshToken),
    tokenExpiresAt || null,
    pageId || null,
    encryptToken(pageAccessToken),
    igUserId || null
  );

  return result.lastInsertRowid || getAccountByPlatformId(platform, platformUserId)?.id;
}

export function getAccountById(id) {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

export function getAccountByPlatformId(platform, platformUserId) {
  return db.prepare('SELECT * FROM accounts WHERE platform = ? AND platform_user_id = ?').get(platform, platformUserId);
}

export function getAllAccounts() {
  return db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
}

export function deleteAccount(id) {
  return db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

export function updateAccountTokens(id, { accessToken, refreshToken, tokenExpiresAt, pageAccessToken }) {
  const fields = ['updated_at = datetime(\'now\')'];
  const values = [];

  if (accessToken !== undefined) {
    fields.push('access_token = ?');
    values.push(encryptToken(accessToken));
  }
  if (refreshToken !== undefined) {
    fields.push('refresh_token = ?');
    values.push(encryptToken(refreshToken));
  }
  if (tokenExpiresAt !== undefined) {
    fields.push('token_expires_at = ?');
    values.push(tokenExpiresAt);
  }
  if (pageAccessToken !== undefined) {
    fields.push('page_access_token = ?');
    values.push(encryptToken(pageAccessToken));
  }

  values.push(id);
  return db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getAccountsExpiringWithinDays(days) {
  const cutoff = Math.floor(Date.now() / 1000) + (days * 86400);
  return db.prepare('SELECT * FROM accounts WHERE token_expires_at IS NOT NULL AND token_expires_at <= ? AND token_expires_at > 0').all(cutoff);
}

// ---------------------------------------------------------------------------
// Post helpers
// ---------------------------------------------------------------------------

export function createPost({ accountId, caption, mediaPath, mediaType, hashtags, scheduledAt }) {
  const stmt = db.prepare(`
    INSERT INTO scheduled_posts (account_id, caption, media_path, media_type, hashtags, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(accountId, caption || null, mediaPath || null, mediaType || 'text', hashtags || null, scheduledAt);
  return result.lastInsertRowid;
}

export function getPostById(id) {
  return db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(id);
}

export function getAllPosts({ status, accountId, from, to } = {}) {
  let query = 'SELECT * FROM scheduled_posts WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (accountId) {
    query += ' AND account_id = ?';
    params.push(accountId);
  }
  if (from) {
    query += ' AND scheduled_at >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND scheduled_at <= ?';
    params.push(to);
  }

  query += ' ORDER BY scheduled_at DESC';
  return db.prepare(query).all(...params);
}

export function getUpcomingPosts() {
  return db.prepare(
    "SELECT sp.*, a.platform, a.name as account_name FROM scheduled_posts sp JOIN accounts a ON sp.account_id = a.id WHERE sp.status = 'pending' AND sp.scheduled_at > datetime('now') ORDER BY sp.scheduled_at ASC"
  ).all();
}

export function getDuePosts() {
  return db.prepare(
    "SELECT * FROM scheduled_posts WHERE status = 'pending' AND scheduled_at <= datetime('now')"
  ).all();
}

export function updatePost(id, { caption, mediaPath, mediaType, hashtags, scheduledAt }) {
  const fields = [];
  const values = [];

  if (caption !== undefined) { fields.push('caption = ?'); values.push(caption); }
  if (mediaPath !== undefined) { fields.push('media_path = ?'); values.push(mediaPath); }
  if (mediaType !== undefined) { fields.push('media_type = ?'); values.push(mediaType); }
  if (hashtags !== undefined) { fields.push('hashtags = ?'); values.push(hashtags); }
  if (scheduledAt !== undefined) { fields.push('scheduled_at = ?'); values.push(scheduledAt); }

  if (fields.length === 0) return null;

  values.push(id);
  return db.prepare(`UPDATE scheduled_posts SET ${fields.join(', ')} WHERE id = ? AND status = 'pending'`).run(...values);
}

export function updatePostStatus(id, status, { errorMessage, platformPostId, publishedAt } = {}) {
  const fields = ['status = ?'];
  const values = [status];

  if (errorMessage !== undefined) { fields.push('error_message = ?'); values.push(errorMessage); }
  if (platformPostId !== undefined) { fields.push('platform_post_id = ?'); values.push(platformPostId); }
  if (publishedAt !== undefined) { fields.push('published_at = ?'); values.push(publishedAt); }

  values.push(id);
  return db.prepare(`UPDATE scheduled_posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deletePost(id) {
  return db.prepare("DELETE FROM scheduled_posts WHERE id = ? AND status = 'pending'").run(id);
}

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

export function upsertAnalytics(postId, data) {
  const stmt = db.prepare(`
    INSERT INTO post_analytics (post_id, reach, impressions, likes, comments, shares, saves, link_clicks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(postId, data.reach || 0, data.impressions || 0, data.likes || 0, data.comments || 0, data.shares || 0, data.saves || 0, data.linkClicks || 0);
}

export function getAnalyticsForPost(postId) {
  return db.prepare('SELECT * FROM post_analytics WHERE post_id = ? ORDER BY fetched_at DESC').all(postId);
}

export { db };
export default db;
