const { prisma } = require('../../config/prisma');
const { stripe } = require('../../config/stripe');

const mapStripeStatus = (status) => {
  if (status === 'active') return 'active';
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled') return 'canceled';
  return 'incomplete';
};

const getUserIdFromRequest = (req) => {
  const userId = req.user?.id || req.headers['x-user-id'];
  if (!userId) {
    const error = new Error('User context missing');
    error.statusCode = 401;
    throw error;
  }
  return userId;
};

const createCheckoutSession = async ({ userId, successUrl, cancelUrl }) => {
  const priceId = process.env.STRIPE_PRICE_ID_PRO;
  if (!priceId) {
    const error = new Error('STRIPE_PRICE_ID_PRO is required');
    error.statusCode = 500;
    throw error;
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        user_id: userId
      }
    }
  });
};

const ensureEventNotProcessed = async (stripeEventId) => {
  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { stripeEventId }
  });

  if (existing) {
    return false;
  }

  await prisma.processedWebhookEvent.create({
    data: {
      stripeEventId
    }
  });

  return true;
};

const upsertSubscriptionFromStripe = async (subscription) => {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    const error = new Error('Stripe subscription missing user metadata');
    error.statusCode = 400;
    throw error;
  }

  const billingStatus = mapStripeStatus(subscription.status);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  await prisma.subscription.upsert({
    where: {
      stripeSubscriptionId: subscription.id
    },
    update: {
      userId,
      billingStatus,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      billingStatus,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { planActive: billingStatus === 'active' ? 'pro' : 'free' }
  });
};

const cancelSubscriptionFromStripe = async (subscription) => {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    const error = new Error('Stripe subscription missing user metadata');
    error.statusCode = 400;
    throw error;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      billingStatus: 'canceled',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { planActive: 'free' }
  });
};

const getSubscriptionForUser = async (userId) => {
  return prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

const cancelSubscriptionForUser = async (userId) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      billingStatus: 'active'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!subscription) {
    const error = new Error('No active subscription found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true
  });

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
    data: {
      cancelAtPeriodEnd: true,
      billingStatus: mapStripeStatus(updated.status),
      currentPeriodEnd: new Date(updated.current_period_end * 1000)
    }
  });

  return updated;
};

module.exports = {
  getUserIdFromRequest,
  createCheckoutSession,
  ensureEventNotProcessed,
  upsertSubscriptionFromStripe,
  cancelSubscriptionFromStripe,
  getSubscriptionForUser,
  cancelSubscriptionForUser
};
