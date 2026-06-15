const router = require('express').Router();
const supabase = require('../../lib/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/user/me
router.get('/me', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/user/connected-platforms
router.get('/connected-platforms', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('connected_platforms')
      .select('platform, username, connected_at')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
