#!/bin/sh
set -e
cd /app/apps/api

# Idempotent repair: only if Phase 5 is stuck unfinished (missing patches FK failure).
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE migration_name = '20260804100000_phase5_deployments'
      AND finished_at IS NULL
  ) THEN
    DROP TABLE IF EXISTS "deployment_events" CASCADE;
    DROP TABLE IF EXISTS "deployments" CASCADE;
    DELETE FROM "_prisma_migrations"
    WHERE migration_name = '20260804100000_phase5_deployments'
      AND finished_at IS NULL;
  END IF;
END $$;
SQL

npx prisma migrate deploy --schema prisma/schema.prisma
exec node dist/main.js
