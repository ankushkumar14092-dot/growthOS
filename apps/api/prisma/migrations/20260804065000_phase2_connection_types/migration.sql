-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('wordpress', 'github', 'zip', 'url_audit');

-- AlterEnum
ALTER TYPE "CredentialKind" ADD VALUE 'github_token';
ALTER TYPE "CredentialKind" ADD VALUE 'zip_storage';

-- AlterTable
ALTER TABLE "sites" ADD COLUMN "connection_type" "ConnectionType" NOT NULL DEFAULT 'wordpress';
