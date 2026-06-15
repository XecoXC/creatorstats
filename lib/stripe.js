const Stripe = require('stripe');

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configuré');
    _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

const PLANS = {
  free: { price: null, limits: { platforms: 1, history_days: 7 } },
  pro: { price: process.env.STRIPE_PRICE_PRO, limits: { platforms: 5, history_days: 90 } },
  agency: { price: process.env.STRIPE_PRICE_AGENCY, limits: { platforms: -1, history_days: 365 } },
};

module.exports = { get stripe() { return getStripe(); }, PLANS };
