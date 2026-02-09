const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16'
});

module.exports = { stripe };
