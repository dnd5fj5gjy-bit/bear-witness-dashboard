import cron from 'node-cron';
import { getAccountsExpiringWithinDays, getAccountById, updateAccountTokens, decryptToken } from '../db.js';

const log = (msg) => console.log(`[${new Date().toISOString()}] [tokenRefresh] ${msg}`);

let cronTask = null;

/**
 * Check for tokens expiring within 7 days and refresh them.
 */
async function refreshExpiringTokens() {
  try {
    const expiringAccounts = getAccountsExpiringWithinDays(7);

    if (expiringAccounts.length === 0) {
      log('No tokens expiring within 7 days.');
      return;
    }

    log(`Found ${expiringAccounts.length} account(s) with tokens expiring within 7 days.`);

    for (const account of expiringAccounts) {
      try {
        await refreshAccountToken(account);
      } catch (err) {
        log(`Failed to refresh token for account ${account.id} (${account.platform}/${account.name}): ${err.message}`);
      }
    }
  } catch (err) {
    log(`Token refresh job error: ${err.message}`);
  }
}

async function refreshAccountToken(account) {
  const accessToken = decryptToken(account.access_token);
  const refreshToken = decryptToken(account.refresh_token);

  switch (account.platform) {
    case 'meta': {
      if (!accessToken) {
        log(`Skipping Meta account ${account.id} — no access token.`);
        return;
      }

      const { META_APP_ID, META_APP_SECRET } = process.env;
      if (!META_APP_ID || !META_APP_SECRET) {
        log(`Skipping Meta account ${account.id} — Meta not configured.`);
        return;
      }

      log(`Refreshing Meta token for account ${account.id} (${account.name})...`);

      const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
      url.searchParams.set('grant_type', 'fb_exchange_token');
      url.searchParams.set('client_id', META_APP_ID);
      url.searchParams.set('client_secret', META_APP_SECRET);
      url.searchParams.set('fb_exchange_token', accessToken);

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const newTokens = {
        accessToken: data.access_token,
        tokenExpiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 5184000),
      };

      // Also refresh page access token if present
      if (account.page_id) {
        const pageRes = await fetch(`https://graph.facebook.com/v21.0/${account.page_id}?fields=access_token&access_token=${data.access_token}`);
        const pageData = await pageRes.json();
        if (pageData.access_token) {
          newTokens.pageAccessToken = pageData.access_token;
        }
      }

      updateAccountTokens(account.id, newTokens);
      log(`Meta token refreshed for account ${account.id}. New expiry: ${new Date(newTokens.tokenExpiresAt * 1000).toISOString()}`);
      break;
    }

    case 'twitter': {
      if (!refreshToken) {
        log(`Skipping Twitter account ${account.id} — no refresh token.`);
        return;
      }

      const { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET } = process.env;
      if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
        log(`Skipping Twitter account ${account.id} — Twitter not configured.`);
        return;
      }

      log(`Refreshing Twitter token for account ${account.id} (${account.name})...`);

      const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
      const res = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      updateAccountTokens(account.id, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        tokenExpiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 7200),
      });

      log(`Twitter token refreshed for account ${account.id}.`);
      break;
    }

    case 'linkedin': {
      if (!refreshToken) {
        log(`Skipping LinkedIn account ${account.id} — no refresh token.`);
        return;
      }

      const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } = process.env;
      if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
        log(`Skipping LinkedIn account ${account.id} — LinkedIn not configured.`);
        return;
      }

      log(`Refreshing LinkedIn token for account ${account.id} (${account.name})...`);

      const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }),
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      updateAccountTokens(account.id, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        tokenExpiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 5184000),
      });

      log(`LinkedIn token refreshed for account ${account.id}.`);
      break;
    }

    default:
      log(`Token refresh not implemented for platform: ${account.platform}`);
  }
}

/**
 * Start the daily token refresh job (runs at 3:00 AM).
 */
export function startTokenRefreshJob() {
  if (cronTask) {
    log('Token refresh job already running.');
    return;
  }

  cronTask = cron.schedule('0 3 * * *', refreshExpiringTokens, {
    scheduled: true,
  });

  log('Token refresh job started (daily at 03:00).');

  // Also run once at startup to catch anything missed
  refreshExpiringTokens().catch(err => {
    log(`Initial token refresh check failed: ${err.message}`);
  });
}

/**
 * Stop the token refresh job.
 */
export function stopTokenRefreshJob() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    log('Token refresh job stopped.');
  }
}
