import { Router } from 'express';
import { getAllAccounts, getAccountById, deleteAccount, decryptToken } from '../db.js';

const router = Router();

const log = (msg) => console.log(`[${new Date().toISOString()}] [accounts] ${msg}`);

/**
 * Sanitize an account record for API response — strip encrypted tokens.
 */
function sanitizeAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    platform: account.platform,
    platformUserId: account.platform_user_id,
    name: account.name,
    username: account.username,
    profileUrl: account.profile_url,
    avatarUrl: account.avatar_url,
    pageId: account.page_id,
    igUserId: account.ig_user_id,
    tokenExpiresAt: account.token_expires_at,
    hasAccessToken: !!account.access_token,
    hasPageAccessToken: !!account.page_access_token,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };
}

// GET /api/accounts — List all connected accounts
router.get('/', (req, res) => {
  try {
    const accounts = getAllAccounts();
    res.json({ accounts: accounts.map(sanitizeAccount) });
  } catch (err) {
    log(`Error listing accounts: ${err.message}`);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// GET /api/accounts/:id — Get single account
router.get('/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ account: sanitizeAccount(account) });
  } catch (err) {
    log(`Error fetching account ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// DELETE /api/accounts/:id — Remove an account
router.delete('/:id', (req, res) => {
  try {
    const account = getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    deleteAccount(req.params.id);
    log(`Deleted account ${req.params.id} (${account.platform}/${account.name})`);
    res.json({ success: true, message: `Account ${account.name} removed` });
  } catch (err) {
    log(`Error deleting account ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
