-- Rename Stripe billing columns to Razorpay

ALTER TABLE "organizations" RENAME COLUMN "stripe_customer_id" TO "razorpay_customer_id";
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_subscription_id" TO "razorpay_subscription_id";
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_price_id" TO "razorpay_plan_id";
