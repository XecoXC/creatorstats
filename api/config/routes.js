const router = require('express').Router();

// Returns public keys safe to expose to the browser
router.get('/', (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL || '',
    supabase_anon_key: process.env.SUPABASE_ANON_KEY || '',
  });
});

module.exports = router;
