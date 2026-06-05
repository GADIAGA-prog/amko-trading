import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // ── CORS (même domaine sur Vercel, mais utile en dev local) ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── 405 pour tout ce qui n'est pas POST ───────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      allowed: ['POST'],
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
