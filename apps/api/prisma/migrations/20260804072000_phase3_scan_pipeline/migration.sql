-- CreateTable
CREATE TABLE IF NOT EXISTS "job_runs" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "error_code" VARCHAR(64),
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crawls" (
    "id" TEXT NOT NULL,
    "job_run_id" TEXT NOT NULL,
    "page_count" INTEGER NOT NULL DEFAULT 0,
    "snapshot_prefix" VARCHAR(512),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crawls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pages" (
    "id" TEXT NOT NULL,
    "crawl_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "http_status" INTEGER,
    "extracted" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "issues" (
    "id" TEXT NOT NULL,
    "job_run_id" TEXT NOT NULL,
    "page_id" TEXT,
    "issue_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(40) NOT NULL,
    "resource_id" VARCHAR(64),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crawls_job_run_id_key" ON "crawls"("job_run_id");
CREATE INDEX IF NOT EXISTS "job_runs_site_id_created_at_idx" ON "job_runs"("site_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "job_runs_status_idx" ON "job_runs"("status");
CREATE INDEX IF NOT EXISTS "pages_crawl_id_idx" ON "pages"("crawl_id");
CREATE INDEX IF NOT EXISTS "issues_job_run_id_severity_idx" ON "issues"("job_run_id", "severity");
CREATE INDEX IF NOT EXISTS "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "crawls" ADD CONSTRAINT "crawls_job_run_id_fkey" FOREIGN KEY ("job_run_id") REFERENCES "job_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pages" ADD CONSTRAINT "pages_crawl_id_fkey" FOREIGN KEY ("crawl_id") REFERENCES "crawls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_job_run_id_fkey" FOREIGN KEY ("job_run_id") REFERENCES "job_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
