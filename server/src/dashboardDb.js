/**
 * Dashboard data layer — clients, campaigns, content posts, research,
 * strategies, proposals, activity feed, and settings.
 *
 * Uses the same SQLite database as the existing social-media scheduler,
 * adding new tables for the dashboard's data model. All entity data is
 * stored as JSON blobs so the frontend schema can evolve without migrations.
 */

import db from './db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export function initDashboardTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dash_clients (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dash_campaigns (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dash_campaigns_client ON dash_campaigns(client_id);

    CREATE TABLE IF NOT EXISTS dash_posts (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      campaign_id TEXT,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dash_posts_client ON dash_posts(client_id);
    CREATE INDEX IF NOT EXISTS idx_dash_posts_campaign ON dash_posts(campaign_id);

    CREATE TABLE IF NOT EXISTS dash_research (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dash_research_client ON dash_research(client_id);

    CREATE TABLE IF NOT EXISTS dash_strategies (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dash_strategies_client ON dash_strategies(client_id);

    CREATE TABLE IF NOT EXISTS dash_proposals (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      strategy_id TEXT,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dash_proposals_client ON dash_proposals(client_id);
    CREATE INDEX IF NOT EXISTS idx_dash_proposals_strategy ON dash_proposals(strategy_id);

    CREATE TABLE IF NOT EXISTS dash_activity_feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data JSON NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dash_settings (
      key TEXT PRIMARY KEY,
      value JSON NOT NULL
    );
  `);

  console.log(`[${new Date().toISOString()}] Dashboard tables initialized`);
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

const VALID_TABLES = new Set([
  'dash_clients', 'dash_campaigns', 'dash_posts', 'dash_research',
  'dash_strategies', 'dash_proposals', 'dash_activity_feed', 'dash_settings',
]);

function assertTable(table) {
  if (!VALID_TABLES.has(table)) {
    throw new Error(`Invalid table: ${table}`);
  }
}

/**
 * Get all rows from a table, parsing the JSON data field.
 */
export function getAll(table) {
  assertTable(table);
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all();
  return rows.map(row => {
    try {
      return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    } catch {
      return row.data;
    }
  });
}

/**
 * Get a single row by ID.
 */
export function getById(table, id) {
  assertTable(table);
  const pkCol = table === 'dash_activity_feed' ? 'id' : 'id';
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${pkCol} = ?`).get(id);
  if (!row) return null;
  try {
    return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  } catch {
    return row.data;
  }
}

/**
 * Get rows where a column matches a value.
 */
export function getByField(table, field, value) {
  assertTable(table);
  // Only allow known indexed columns
  const allowed = ['client_id', 'campaign_id', 'strategy_id'];
  if (!allowed.includes(field)) {
    throw new Error(`Cannot filter by field: ${field}`);
  }
  const rows = db.prepare(`SELECT * FROM ${table} WHERE ${field} = ? ORDER BY created_at DESC`).all(value);
  return rows.map(row => {
    try {
      return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    } catch {
      return row.data;
    }
  });
}

/**
 * Insert or replace a row. The full object is stored in the data JSON column.
 * Extra indexed columns (client_id, campaign_id, etc.) are extracted from data.
 */
export function upsert(table, id, data) {
  assertTable(table);

  switch (table) {
    case 'dash_clients':
      db.prepare(`
        INSERT INTO dash_clients (id, data, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
      `).run(id, JSON.stringify(data));
      break;

    case 'dash_campaigns':
      db.prepare(`
        INSERT INTO dash_campaigns (id, client_id, data, updated_at) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, data = excluded.data, updated_at = datetime('now')
      `).run(id, data.clientId || null, JSON.stringify(data));
      break;

    case 'dash_posts':
      db.prepare(`
        INSERT INTO dash_posts (id, client_id, campaign_id, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, campaign_id = excluded.campaign_id, data = excluded.data, updated_at = datetime('now')
      `).run(id, data.clientId || null, data.campaignId || null, JSON.stringify(data));
      break;

    case 'dash_research':
      db.prepare(`
        INSERT INTO dash_research (id, client_id, data, updated_at) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, data = excluded.data, updated_at = datetime('now')
      `).run(id, data.clientId || null, JSON.stringify(data));
      break;

    case 'dash_strategies':
      db.prepare(`
        INSERT INTO dash_strategies (id, client_id, data, updated_at) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, data = excluded.data, updated_at = datetime('now')
      `).run(id, data.clientId || null, JSON.stringify(data));
      break;

    case 'dash_proposals':
      db.prepare(`
        INSERT INTO dash_proposals (id, client_id, strategy_id, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, strategy_id = excluded.strategy_id, data = excluded.data, updated_at = datetime('now')
      `).run(id, data.clientId || null, data.strategyId || null, JSON.stringify(data));
      break;

    case 'dash_activity_feed':
      // Activity feed uses autoincrement; id in data is the frontend-generated ID
      db.prepare(`INSERT INTO dash_activity_feed (data) VALUES (?)`).run(JSON.stringify(data));
      break;

    default:
      throw new Error(`Upsert not implemented for ${table}`);
  }
}

/**
 * Delete a row by ID.
 */
export function remove(table, id) {
  assertTable(table);
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

/**
 * Delete all rows matching a field value (used for cascade deletes).
 */
export function removeByField(table, field, value) {
  assertTable(table);
  const allowed = ['client_id', 'campaign_id', 'strategy_id'];
  if (!allowed.includes(field)) {
    throw new Error(`Cannot delete by field: ${field}`);
  }
  return db.prepare(`DELETE FROM ${table} WHERE ${field} = ?`).run(value);
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

export function getSettings() {
  const rows = db.prepare('SELECT * FROM dash_settings').all();
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

export function updateSettings(data) {
  const upsertStmt = db.prepare(`
    INSERT INTO dash_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsertStmt.run(key, JSON.stringify(value));
    }
  });

  tx(Object.entries(data));
}

// ---------------------------------------------------------------------------
// Activity feed helpers
// ---------------------------------------------------------------------------

export function getActivityFeed(limit = 200, clientId = null) {
  if (clientId) {
    // Filter by clientId inside the JSON data
    const rows = db.prepare(`
      SELECT * FROM dash_activity_feed
      WHERE json_extract(data, '$.clientId') = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(clientId, limit);
    return rows.map(row => {
      try {
        return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch {
        return row.data;
      }
    });
  }

  const rows = db.prepare(`
    SELECT * FROM dash_activity_feed ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  return rows.map(row => {
    try {
      return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    } catch {
      return row.data;
    }
  });
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export function backupDatabase() {
  const dbPath = path.join(__dirname, '..', 'data', 'bear-witness.db');
  const backupDir = path.join(__dirname, '..', 'data', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(backupDir, `bearwitness-${dateStr}.db`);

  // Use SQLite backup API via better-sqlite3
  db.backup(backupPath)
    .then(() => {
      console.log(`[${new Date().toISOString()}] Backup created: ${backupPath}`);
      pruneOldBackups(backupDir, 30);
    })
    .catch(err => {
      console.error(`[${new Date().toISOString()}] Backup failed:`, err.message);
    });
}

function pruneOldBackups(backupDir, keepCount) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('bearwitness-') && f.endsWith('.db'))
      .sort()
      .reverse();

    const toDelete = files.slice(keepCount);
    for (const file of toDelete) {
      fs.unlinkSync(path.join(backupDir, file));
      console.log(`[${new Date().toISOString()}] Deleted old backup: ${file}`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Backup pruning failed:`, err.message);
  }
}
