const router = require('express').Router();
const supabase = require('../../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const YT_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const YT_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL}/api/platforms/youtube/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ');

// GET /api/platforms/youtube/auth?token=<jwt>
// Redirects user to Google OAuth with YouTube scopes
router.get('/auth', requireAuth, (req, res) => {
  const state = Buffer.from(JSON.stringify({ uid: req.user.id })).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', YT_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

// GET /api/platforms/youtube/callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) return res.redirect(`${process.env.APP_URL}?yt_error=access_denied`);

  try {
    const { uid } = JSON.parse(Buffer.from(state, 'base64url').toString());
    console.log('[YT callback] uid:', uid);

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    console.log('[YT callback] token exchange status:', tokenRes.status, tokens.error || 'ok');
    if (!tokenRes.ok) throw new Error(tokens.error_description || 'token exchange failed');

    // Fetch channel info
    const channel = await fetchYouTubeChannel(tokens.access_token);
    console.log('[YT callback] channel:', channel.title, channel.id);

    // Ensure profile exists (FK requirement)
    await supabase.from('profiles').upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true });

    // Store in Supabase
    const { error: upsertErr } = await supabase.from('connected_platforms').upsert({
      user_id: uid, platform: 'youtube',
      username: channel.title,
      platform_user_id: channel.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    console.log('[YT callback] upsert error:', upsertErr?.message || 'none');
    if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr.message}`);

    // Store initial stats snapshot
    await storeYouTubeStats(uid, channel, tokens.access_token);

    res.redirect(`${process.env.APP_URL}?yt_connected=1`);
  } catch (err) {
    console.error('YouTube callback error:', err);
    res.redirect(`${process.env.APP_URL}?yt_error=callback_failed`);
  }
});

// POST /api/platforms/youtube/sync — refresh stats
router.post('/sync', requireAuth, async (req, res, next) => {
  try {
    const { data: platform } = await supabase
      .from('connected_platforms')
      .select('access_token, refresh_token, platform_user_id')
      .eq('user_id', req.user.id)
      .eq('platform', 'youtube')
      .single();

    if (!platform) return res.status(404).json({ error: 'YouTube non connecté' });

    let token = platform.access_token;

    // Refresh token if needed
    if (platform.refresh_token) {
      const refreshed = await refreshAccessToken(platform.refresh_token);
      if (refreshed) {
        token = refreshed.access_token;
        await supabase.from('connected_platforms')
          .update({ access_token: token })
          .eq('user_id', req.user.id)
          .eq('platform', 'youtube');
      }
    }

    const channel = await fetchYouTubeChannel(token);
    await storeYouTubeStats(req.user.id, channel, token);

    res.json({ success: true, channel });
  } catch (err) {
    next(err);
  }
});

// GET /api/platforms/youtube/stats — get stored stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('platform_stats')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('platform', 'youtube')
      .order('recorded_at', { ascending: false })
      .limit(90);

    const { data: platform } = await supabase
      .from('connected_platforms')
      .select('username, platform_user_id, connected_at')
      .eq('user_id', req.user.id)
      .eq('platform', 'youtube')
      .single();

    res.json({ stats: data || [], channel: platform || null });
  } catch (err) {
    next(err);
  }
});

async function fetchYouTubeChannel(accessToken) {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!res.ok || !data.items?.length) throw new Error('No YouTube channel found');
  const ch = data.items[0];
  return {
    id: ch.id,
    title: ch.snippet.title,
    thumbnail: ch.snippet.thumbnails?.default?.url,
    subscribers: parseInt(ch.statistics.subscriberCount || 0),
    views: parseInt(ch.statistics.viewCount || 0),
    videoCount: parseInt(ch.statistics.videoCount || 0),
  };
}

async function storeYouTubeStats(userId, channel, accessToken) {
  // Get recent videos for engagement
  const vidRes = await fetch(
    'https://www.googleapis.com/youtube/v3/search?part=id&forMine=true&type=video&order=date&maxResults=10',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  let likes = 0, comments = 0;
  if (vidRes.ok) {
    const vidData = await vidRes.json();
    const ids = (vidData.items || []).map(v => v.id.videoId).filter(Boolean).join(',');
    if (ids) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        for (const v of statsData.items || []) {
          likes += parseInt(v.statistics.likeCount || 0);
          comments += parseInt(v.statistics.commentCount || 0);
        }
      }
    }
  }

  const engagement = channel.subscribers > 0
    ? Math.min(((likes + comments) / channel.subscribers) * 100, 100).toFixed(2)
    : 0;

  await supabase.from('platform_stats').insert({
    user_id: userId,
    platform: 'youtube',
    followers: channel.subscribers,
    views: channel.views,
    likes,
    comments,
    engagement_rate: engagement,
    recorded_at: new Date().toISOString(),
  });
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

module.exports = router;
