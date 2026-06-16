const router = require('express').Router();
const supabase = require('../../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/ai/chat — proxy Claude calls server-side (user's key stays off the browser)
router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return res.status(402).json({ error: 'no_api_key', message: 'Clé API Anthropic non configurée côté serveur' });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt || 'Tu es un expert en marketing digital et growth hacking pour créateurs de contenu FR. Réponds toujours en JSON valide uniquement, sans markdown ni backticks.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json(data);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/key — save user's Anthropic API key to their profile
router.post('/key', requireAuth, async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key || !key.startsWith('sk-ant-')) {
      return res.status(400).json({ error: 'Clé API Anthropic invalide (doit commencer par sk-ant-)' });
    }
    const { error } = await supabase
      .from('profiles')
      .update({ anthropic_api_key: key, updated_at: new Date().toISOString() })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
