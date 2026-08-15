-- Phase 7: subscriptions + usage_events (ids are TEXT to match existing org PKs)
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'free',
    "stripe_subscription_id" VARCHAR(255),
    "stripe_price_id" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "period_start" DATE,
    "period_end" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");
CREATE INDEX "usage_events_organization_id_occurred_at_idx" ON "usage_events"("organization_id", "occurred_at" DESC);
CREATE INDEX "usage_events_organization_id_metric_idx" ON "usage_events"("organization_id", "metric");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
