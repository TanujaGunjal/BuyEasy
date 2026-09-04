const Stripe = require('stripe');

// Only initialize if the key exists to prevent crashing during tests/startup
// if the user hasn't configured it yet.
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not defined in environment variables. Stripe features will not work.');
}

const stripe = stripeSecret ? Stripe(stripeSecret) : null;

module.exports = stripe;
