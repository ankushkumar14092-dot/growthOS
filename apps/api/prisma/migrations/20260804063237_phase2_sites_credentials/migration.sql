-- CreateEnum
CREATE TYPE "CredentialKind" AS ENUM ('plugin_token', 'app_password');

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "cms" VARCHAR(30) NOT NULL DEFAULT 'wordpress',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "health_status" VARCHAR(30),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "kind" "CredentialKind" NOT NULL,
    "secret_ciphertext" BYTEA NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sites_organization_id_idx" ON "sites"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_site_id_key" ON "credentials"("site_id");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Active-site uniqueness (soft-delete aware)
CREATE UNIQUE INDEX "sites_org_domain_active_key"
  ON "sites"("organization_id", "domain")
  WHERE "deleted_at" IS NULL;
