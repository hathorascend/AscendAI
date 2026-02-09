const express = require('express');
const { stripe } = require('../config/stripe');
const {
  getUserIdFromRequest,
  createCheckoutSession,
  ensureEventNotProcessed,
  upsertSubscriptionFromStripe,
  cancelSubscriptionFromStripe,
  getSubscriptionForUser,
  cancelSubscriptionForUser
} = require('../modules/billing/billing.service');

const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { success_url: successUrl, cancel_url: cancelUrl } = req.body || {};

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'success_url and cancel_url are required' });
    }

    const session = await createCheckoutSession({ userId, successUrl, cancelUrl });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Missing webhook signature or secret' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  try {
    const shouldProcess = await ensureEventNotProcessed(event.id);
    if (!shouldProcess) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      await upsertSubscriptionFromStripe(event.data.object);
    }

    if (event.type === 'customer.subscription.deleted') {
      await cancelSubscriptionFromStripe(event.data.object);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

router.get('/subscription', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const subscription = await getSubscriptionForUser(userId);

    return res.status(200).json({ subscription });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

router.post('/cancel', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const subscription = await cancelSubscriptionForUser(userId);

    return res.status(200).json({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

module.exports = router;
