import Anthropic from '@anthropic-ai/sdk';

// ── Garde-fous du proxy Anthropic ──────────────────────────────────
// 1) CORS restreint : même origine que le déploiement (ou ALLOWED_ORIGINS).
// 2) Rate-limit par IP (best effort — mémoire de l'instance serverless).
// 3) Taille du payload plafonnée.
const RATE_LIMIT   = { windowMs: 5 * 60 * 1000, max: 30 }; // 30 req / 5 min / IP
const MAX_BODY_LEN = 200_000; // ~200 KB de JSON
const hits = new Map(); // ip -> { count, reset }

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_LIMIT.windowMs });
    if (hits.size > 5000) hits.clear(); // borne mémoire
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

function resolveCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null; // requête same-origin ou non-navigateur : pas d'en-tête CORS nécessaire
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return origin;
  try {
    // Autorise l'origine qui correspond à l'hôte du déploiement (prod + previews Vercel)
    if (new URL(origin).host === req.headers.host) return origin;
  } catch {}
  return null;
}

export default async function handler(req, res) {
  const corsOrigin = resolveCorsOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(corsOrigin ? 204 : 403).end();
  }

  // Origine navigateur inconnue → refus (empêche la consommation de la clé depuis d'autres sites)
  if (req.headers.origin && !corsOrigin) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Origin not allowed.' });
  }

  // ── 405 pour tout ce qui n'est pas POST ───────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      allowed: ['POST'],
    });
  }

  // ── Rate limit par IP ─────────────────────────────────────────
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({
      error: 'Too Many Requests',
      detail: `Limite de ${RATE_LIMIT.max} requêtes / ${RATE_LIMIT.windowMs / 60000} min atteinte. Réessayez plus tard.`,
    });
  }

  // ── Clé API — jamais dans le code ────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Server misconfiguration',
      detail: 'ANTHROPIC_API_KEY environment variable is not set.',
    });
  }

  // ── Validation du corps ───────────────────────────────────────
  const { messages, system, tools } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      detail: '"messages" must be a non-empty array.',
    });
  }
  try {
    if (JSON.stringify(req.body).length > MAX_BODY_LEN) {
      return res.status(413).json({ error: 'Payload Too Large', detail: `Body must stay under ${MAX_BODY_LEN} bytes.` });
    }
  } catch {
    return res.status(400).json({ error: 'Bad Request', detail: 'Body is not serializable JSON.' });
  }

  // ── Appel Anthropic ───────────────────────────────────────────
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const params = {
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages,
    };

    // Champs optionnels — ajoutés seulement s'ils sont fournis
    if (typeof system === 'string' && system.trim()) {
      params.system = system;
    }
    if (Array.isArray(tools) && tools.length > 0) {
      params.tools = tools;
    }

    const response = await client.messages.create(params);

    // Renvoie la réponse complète (inclut les blocs tool_use si présents)
    return res.status(200).json(response);

  } catch (err) {
    // Le SDK Anthropic expose err.status pour les erreurs HTTP
    const httpStatus = typeof err.status === 'number' ? err.status : 502;

    return res.status(httpStatus).json({
      error: err.name ?? 'AnthropicError',
      message: err.message ?? 'Unexpected error calling the Anthropic API.',
      ...(err.error ? { detail: err.error } : {}),
    });
  }
}
