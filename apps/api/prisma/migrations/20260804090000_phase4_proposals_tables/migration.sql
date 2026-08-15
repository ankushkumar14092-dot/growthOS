-- Phase 4 tables (proposals / events / patches).
-- The earlier 20260804080000 migration was a no-op stub (db push only).

CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "job_run_id" TEXT NOT NULL,
    "proposal_type" VARCHAR(40) NOT NULL,
    "before_value" TEXT NOT NULL,
    "after_value" TEXT NOT NULL,
    "business_impact" TEXT NOT NULL,
    "impact_type" VARCHAR(40) NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "change_class" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "model" VARCHAR(80),
    "prompt_version" VARCHAR(40),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposal_events" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "event" VARCHAR(40) NOT NULL,
    "actor" VARCHAR(20) NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patches" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "change_class" VARCHAR(20) NOT NULL,
    "target" JSONB NOT NULL,
    "before_state" JSONB NOT NULL,
    "after_state" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patches_proposal_id_key" ON "patches"("proposal_id");
CREATE INDEX "proposals_site_id_status_idx" ON "proposals"("site_id", "status");
CREATE INDEX "proposals_job_run_id_idx" ON "proposals"("job_run_id");
CREATE INDEX "proposals_issue_id_idx" ON "proposals"("issue_id");
CREATE INDEX "proposal_events_proposal_id_created_at_idx" ON "proposal_events"("proposal_id", "created_at" DESC);
CREATE INDEX "patches_site_id_change_class_idx" ON "patches"("site_id", "change_class");

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_job_run_id_fkey" FOREIGN KEY ("job_run_id") REFERENCES "job_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patches" ADD CONSTRAINT "patches_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patches" ADD CONSTRAINT "patches_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
