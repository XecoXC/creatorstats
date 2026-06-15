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
  free:    { price: null,                              limits: { platforms: 1,  history_days: 7,   ai_calls: 5  } },
  creator: { price: process.env.STRIPE_PRICE_CREATOR, limits: { platforms: 3,  history_days: 30,  ai_calls: 20 } },
  pro:     { price: process.env.STRIPE_PRICE_PRO,     limits: { platforms: 5,  history_days: 90,  ai_calls: -1 } },
  agency:  { price: process.env.STRIPE_PRICE_AGENCY,  limits: { platforms: -1, history_days: 365, ai_calls: -1 } },
};

module.exports = { get stripe() { return getStripe(); }, PLANS };
