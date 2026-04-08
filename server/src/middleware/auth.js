/**
 * API key authentication middleware.
 *
 * In production (API_KEY env var is set), requests must include a matching
 * X-API-Key header. In dev mode (no API_KEY set), all requests pass through.
 */
export function apiKeyAuth(req, res, next) {
  const apiKey = process.env.API_KEY;

  // Dev mode — no API key configured, allow everything
  if (!apiKey) {
    return next();
  }

  const provided = req.headers['x-api-key'];

  if (!provided) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  if (provided !== apiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}
