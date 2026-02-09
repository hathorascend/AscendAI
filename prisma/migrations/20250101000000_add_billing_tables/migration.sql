-- CreateEnum
CREATE TYPE "PlanActive" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('active', 'past_due', 'canceled', 'incomplete');

-- CreateEnum
CREATE TYPE "ScheduledSlotStatus" AS ENUM ('reserved', 'consumed', 'canceled');

-- CreateEnum
CREATE TYPE "PlanOverrideType" AS ENUM ('free_extension', 'pro_trial', 'extra_posts');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "planActive" "PlanActive" NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "billingStatus" "BillingStatus" NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" UUID NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledSlot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "postId" UUID,
    "status" "ScheduledSlotStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanOverride" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "campaignId" UUID,
    "overrideType" "PlanOverrideType" NOT NULL,
    "maxExtraScheduledPosts" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" UUID,

    CONSTRAINT "PlanOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhookEvent_stripeEventId_key" ON "ProcessedWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "ScheduledSlot_userId_yearMonth_idx" ON "ScheduledSlot"("userId", "yearMonth");

-- CreateIndex
CREATE INDEX "PlanOverride_userId_idx" ON "PlanOverride"("userId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledSlot" ADD CONSTRAINT "ScheduledSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanOverride" ADD CONSTRAINT "PlanOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
