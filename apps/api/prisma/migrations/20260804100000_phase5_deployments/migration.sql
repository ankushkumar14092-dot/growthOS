-- Phase 5: deployments + deployment_events (trust loop)
-- IDs are TEXT to match existing Prisma @default(uuid()) columns

CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "proposal_id" TEXT,
    "job_run_id" TEXT,
    "action" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "backup" JSONB NOT NULL DEFAULT '{}',
    "verify_result" JSONB,
    "error_message" TEXT,
    "rollback_of_id" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deployment_events" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "event" VARCHAR(40) NOT NULL,
    "message" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deployments_site_id_created_at_idx" ON "deployments"("site_id", "created_at" DESC);
CREATE INDEX "deployments_patch_id_action_idx" ON "deployments"("patch_id", "action");
CREATE INDEX "deployments_status_idx" ON "deployments"("status");
CREATE INDEX "deployment_events_deployment_id_created_at_idx" ON "deployment_events"("deployment_id", "created_at" ASC);

ALTER TABLE "deployments" ADD CONSTRAINT "deployments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_rollback_of_id_fkey" FOREIGN KEY ("rollback_of_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deployment_events" ADD CONSTRAINT "deployment_events_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
