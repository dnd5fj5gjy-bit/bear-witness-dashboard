import { Router } from 'express';
import crypto from 'node:crypto';
import {
  createAccount,
  getAccountById,
  updateAccountTokens,
  decryptToken,
} from '../db.js';

const router = Router();

const log = (msg) => console.log(`[${new Date().toISOString()}] [auth] ${msg}`);

// In-memory store for OAuth state / PKCE verifiers (short-lived)
const oauthStates = new Map();

function generateState() {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, { createdAt: Date.now() });
  // Clean up states older than 10 minutes
  for (const [key, val] of oauthStates) {
    if (Date.now() - val.createdAt > 600_000) oauthStates.delete(key);
  }
  return state;
}

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// ---------------------------------------------------------------------------
// Meta / Facebook / Instagram
// ---------------------------------------------------------------------------

router.get('/meta', (req, res) => {
  const { META_APP_ID, META_REDIRECT_URI } = process.env;
  if (!META_APP_ID || !META_REDIRECT_URI) {
    return res.status(500).json({ error: 'Meta OAuth not configured' });
  }

  const state = generateState();
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'business_management',
  ].join(',');

  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', META_APP_ID);
  url.searchParams.set('redirect_uri', META_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('response_type', 'code');

  log(`Redirecting to Meta OAuth (state=${state.slice(0, 8)}...)`);
  res.redirect(url.toString());
});

router.get('/meta/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    log(`Meta OAuth error: ${error} — ${error_description}`);
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('No authorization code received')}`);
  }

  if (!state || !oauthStates.has(state)) {
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('Invalid OAuth state')}`);
  }
  oauthStates.delete(state);

  try {
    const { META_APP_ID, META_APP_SECRET, META_REDIRECT_URI } = process.env;

    // Step 1: Exchange code for short-lived token
    log('Exchanging code for short-lived token...');
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Failed to exchange code');
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived token (60 days)
    log('Exchanging for long-lived token...');
    const longTokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longTokenUrl.searchParams.set('client_id', META_APP_ID);
    longTokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    longTokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();

    if (longTokenData.error) {
      throw new Error(longTokenData.error.message || 'Failed to get long-lived token');
    }

    const accessToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || 5184000; // Default 60 days
    const tokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // Step 3: Get user profile
    log('Fetching user profile...');
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${accessToken}`);
    const meData = await meRes.json();

    if (meData.error) {
      throw new Error(meData.error.message || 'Failed to fetch user profile');
    }

    // Step 4: Get user's pages
    log('Fetching user pages...');
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,picture,instagram_business_account{id,name,username,profile_picture_url}&access_token=${accessToken}`);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      throw new Error(pagesData.error.message || 'Failed to fetch pages');
    }

    const pages = pagesData.data || [];
    const accountIds = [];

    // Store each page as a separate account
    for (const page of pages) {
      // Store Facebook Page
      const fbAccountId = createAccount({
        platform: 'meta',
        platformUserId: `fb_page_${page.id}`,
        name: page.name,
        username: page.name,
        profileUrl: `https://facebook.com/${page.id}`,
        avatarUrl: page.picture?.data?.url || null,
        accessToken: accessToken,
        refreshToken: null,
        tokenExpiresAt: tokenExpiresAt,
        pageId: page.id,
        pageAccessToken: page.access_token,
        igUserId: null,
      });
      accountIds.push(fbAccountId);
      log(`Stored Facebook Page: ${page.name} (${page.id})`);

      // If page has connected Instagram, store that too
      const igAccount = page.instagram_business_account;
      if (igAccount) {
        const igAccountId = createAccount({
          platform: 'meta',
          platformUserId: `ig_${igAccount.id}`,
          name: igAccount.name || page.name,
          username: igAccount.username || null,
          profileUrl: igAccount.username ? `https://instagram.com/${igAccount.username}` : null,
          avatarUrl: igAccount.profile_picture_url || null,
          accessToken: accessToken,
          refreshToken: null,
          tokenExpiresAt: tokenExpiresAt,
          pageId: page.id,
          pageAccessToken: page.access_token,
          igUserId: igAccount.id,
        });
        accountIds.push(igAccountId);
        log(`Stored Instagram account: ${igAccount.username || igAccount.id}`);
      }
    }

    // If no pages found, store the user account itself
    if (pages.length === 0) {
      const userId = createAccount({
        platform: 'meta',
        platformUserId: meData.id,
        name: meData.name,
        username: meData.name,
        profileUrl: `https://facebook.com/${meData.id}`,
        avatarUrl: null,
        accessToken: accessToken,
        refreshToken: null,
        tokenExpiresAt: tokenExpiresAt,
        pageId: null,
        pageAccessToken: null,
        igUserId: null,
      });
      accountIds.push(userId);
      log(`Stored user account: ${meData.name} (no pages found)`);
    }

    log(`Meta OAuth complete. ${accountIds.length} account(s) stored.`);
    res.redirect(`${frontendUrl}/settings?success=meta&accounts=${accountIds.length}`);
  } catch (err) {
    log(`Meta OAuth error: ${err.message}`);
    res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(err.message)}`);
  }
});

router.get('/meta/pages/:accountId', async (req, res) => {
  try {
    const account = getAccountById(req.params.accountId);
    if (!account || account.platform !== 'meta') {
      return res.status(404).json({ error: 'Meta account not found' });
    }

    const accessToken = decryptToken(account.access_token);
    if (!accessToken) {
      return res.status(400).json({ error: 'No valid access token' });
    }

    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,picture,instagram_business_account{id,name,username}&access_token=${accessToken}`);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return res.status(400).json({ error: pagesData.error.message });
    }

    res.json({ pages: pagesData.data || [] });
  } catch (err) {
    log(`Error fetching Meta pages: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// ---------------------------------------------------------------------------
// LinkedIn
// ---------------------------------------------------------------------------

router.get('/linkedin', (req, res) => {
  const { LINKEDIN_CLIENT_ID, LINKEDIN_REDIRECT_URI } = process.env;
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
    return res.status(500).json({ error: 'LinkedIn OAuth not configured' });
  }

  const state = generateState();
  const scopes = 'openid profile w_member_social';

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
  url.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scopes);

  log(`Redirecting to LinkedIn OAuth (state=${state.slice(0, 8)}...)`);
  res.redirect(url.toString());
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    log(`LinkedIn OAuth error: ${error} — ${error_description}`);
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('No authorization code received')}`);
  }

  if (!state || !oauthStates.has(state)) {
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('Invalid OAuth state')}`);
  }
  oauthStates.delete(state);

  try {
    const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI } = process.env;

    // Exchange code for token
    log('Exchanging LinkedIn code for token...');
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: LINKEDIN_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000;
    const tokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const refreshToken = tokenData.refresh_token || null;

    // Fetch user profile
    log('Fetching LinkedIn profile...');
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    if (profile.error) {
      throw new Error(profile.error_description || 'Failed to fetch profile');
    }

    const accountId = createAccount({
      platform: 'linkedin',
      platformUserId: profile.sub,
      name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
      username: profile.email || null,
      profileUrl: `https://linkedin.com/in/${profile.sub}`,
      avatarUrl: profile.picture || null,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      pageId: null,
      pageAccessToken: null,
      igUserId: null,
    });

    log(`LinkedIn OAuth complete. Account stored (id=${accountId}).`);
    res.redirect(`${frontendUrl}/settings?success=linkedin`);
  } catch (err) {
    log(`LinkedIn OAuth error: ${err.message}`);
    res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(err.message)}`);
  }
});

// ---------------------------------------------------------------------------
// X / Twitter (OAuth 2.0 with PKCE)
// ---------------------------------------------------------------------------

router.get('/twitter', (req, res) => {
  const { TWITTER_CLIENT_ID, TWITTER_REDIRECT_URI } = process.env;
  if (!TWITTER_CLIENT_ID || !TWITTER_REDIRECT_URI) {
    return res.status(500).json({ error: 'Twitter OAuth not configured' });
  }

  const state = generateState();
  const { verifier, challenge } = generatePKCE();
  oauthStates.set(state, { createdAt: Date.now(), codeVerifier: verifier });

  const scopes = 'tweet.read tweet.write users.read offline.access';

  const url = new URL('https://twitter.com/i/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', TWITTER_CLIENT_ID);
  url.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  log(`Redirecting to Twitter OAuth (state=${state.slice(0, 8)}...)`);
  res.redirect(url.toString());
});

router.get('/twitter/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    log(`Twitter OAuth error: ${error}`);
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('No authorization code received')}`);
  }

  const stateData = oauthStates.get(state);
  if (!state || !stateData) {
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('Invalid OAuth state')}`);
  }
  const { codeVerifier } = stateData;
  oauthStates.delete(state);

  try {
    const { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_REDIRECT_URI } = process.env;

    // Exchange code for token
    log('Exchanging Twitter code for token...');
    const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: TWITTER_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || 7200;
    const tokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // Fetch user info
    log('Fetching Twitter user info...');
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();

    if (userData.errors) {
      throw new Error(userData.errors[0]?.message || 'Failed to fetch user');
    }

    const user = userData.data;

    const accountId = createAccount({
      platform: 'twitter',
      platformUserId: user.id,
      name: user.name,
      username: user.username,
      profileUrl: `https://x.com/${user.username}`,
      avatarUrl: user.profile_image_url || null,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      pageId: null,
      pageAccessToken: null,
      igUserId: null,
    });

    log(`Twitter OAuth complete. Account stored (id=${accountId}).`);
    res.redirect(`${frontendUrl}/settings?success=twitter`);
  } catch (err) {
    log(`Twitter OAuth error: ${err.message}`);
    res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(err.message)}`);
  }
});

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

router.post('/refresh/:accountId', async (req, res) => {
  try {
    const account = getAccountById(req.params.accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const accessToken = decryptToken(account.access_token);
    const refreshToken = decryptToken(account.refresh_token);

    let newTokens;

    switch (account.platform) {
      case 'meta': {
        // Refresh Meta long-lived token
        const { META_APP_ID, META_APP_SECRET } = process.env;
        const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
        url.searchParams.set('grant_type', 'fb_exchange_token');
        url.searchParams.set('client_id', META_APP_ID);
        url.searchParams.set('client_secret', META_APP_SECRET);
        url.searchParams.set('fb_exchange_token', accessToken);

        const tokenRes = await fetch(url);
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          throw new Error(tokenData.error.message);
        }

        newTokens = {
          accessToken: tokenData.access_token,
          tokenExpiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 5184000),
        };

        // Also refresh page access token if present
        if (account.page_id) {
          const pageRes = await fetch(`https://graph.facebook.com/v21.0/${account.page_id}?fields=access_token&access_token=${tokenData.access_token}`);
          const pageData = await pageRes.json();
          if (pageData.access_token) {
            newTokens.pageAccessToken = pageData.access_token;
          }
        }
        break;
      }

      case 'twitter': {
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        const { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET } = process.env;
        const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');

        const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
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
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        newTokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          tokenExpiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 7200),
        };
        break;
      }

      case 'linkedin': {
        if (!refreshToken) {
          throw new Error('No refresh token available for LinkedIn');
        }
        const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } = process.env;

        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: LINKEDIN_CLIENT_SECRET,
          }),
        });
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }

        newTokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          tokenExpiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 5184000),
        };
        break;
      }

      default:
        return res.status(400).json({ error: `Token refresh not supported for ${account.platform}` });
    }

    updateAccountTokens(account.id, newTokens);
    log(`Token refreshed for account ${account.id} (${account.platform}/${account.name})`);

    res.json({ success: true, expiresAt: newTokens.tokenExpiresAt });
  } catch (err) {
    log(`Token refresh error for account ${req.params.accountId}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
