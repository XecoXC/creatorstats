const router = require('express').Router();
const supabase = require('../../lib/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const SUPPORTED = ['tiktok', 'instagram', 'youtube', 'twitch', 'kick'];

// GET /api/platforms/:platform/stats
router.get('/:platform/stats', async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!SUPPORTED.includes(platform)) {
      return res.status(400).json({ error: 'Unsupported platform' });
    }

    const { data, error } = await supabase
      .from('platform_stats')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('platform', platform)
      .order('recorded_at', { ascending: false })
      .limit(90);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/platforms/:platform/connect
router.post('/:platform/connect', async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!SUPPORTED.includes(platform)) {
      return res.status(400).json({ error: 'Unsupported platform' });
    }

    const { username, access_token, refresh_token, platform_user_id } = req.body;

    const { error } = await supabase.from('connected_platforms').upsert({
      user_id: req.user.id,
      platform,
      username,
      access_token,
      refresh_token,
      platform_user_id,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/platforms/:platform/disconnect
router.delete('/:platform/disconnect', async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { error } = await supabase
      .from('connected_platforms')
      .delete()
      .eq('user_id', req.user.id)
      .eq('platform', platform);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
