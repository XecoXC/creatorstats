const router = require('express').Router();
const stripeLib = require('../../lib/stripe');
const supabase = require('../../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/stripe/checkout — create checkout session
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const { plan } = req.body;
    const { PLANS } = stripeLib;
    if (!PLANS[plan] || !PLANS[plan].price) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', req.user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeLib.stripe.customers.create({
        email: profile.email,
        metadata: { supabase_uid: req.user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', req.user.id);
    }

    const session = await stripeLib.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PLANS[plan].price, quantity: 1 }],
      success_url: `${process.env.APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata: { supabase_uid: req.user.id, plan },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/stripe/portal — customer portal
router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripeLib.stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.APP_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/stripe/webhook — Stripe events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeLib.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const uid = session.metadata.supabase_uid;
      const plan = session.metadata.plan;
      await supabase.from('subscriptions').upsert({
        user_id: uid,
        plan,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('subscriptions')
        .update({ plan: 'free', status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      await supabase.from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', inv.subscription);
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
