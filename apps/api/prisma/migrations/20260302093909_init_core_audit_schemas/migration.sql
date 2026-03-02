-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema (empty placeholders for future domain schemas)
CREATE SCHEMA IF NOT EXISTS "evaluation";
CREATE SCHEMA IF NOT EXISTS "publication";

-- CreateEnum
CREATE TYPE "core"."ContributorRole" AS ENUM ('PUBLIC', 'APPLICANT', 'CONTRIBUTOR', 'EDITOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'ADMIN');

-- CreateEnum
CREATE TYPE "core"."ContributorDomain" AS ENUM ('Technology', 'Fintech', 'Impact', 'Governance');

-- CreateTable
CREATE TABLE "core"."contributors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "github_id" INTEGER NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "bio" VARCHAR(500),
    "avatar_url" TEXT,
    "domain" "core"."ContributorDomain",
    "role" "core"."ContributorRole" NOT NULL DEFAULT 'PUBLIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Enforce immutable audit logs (no UPDATE/DELETE)
CREATE OR REPLACE FUNCTION "audit"."prevent_audit_log_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable and cannot be % operations', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_no_update"
BEFORE UPDATE ON "audit"."audit_logs"
FOR EACH ROW
EXECUTE FUNCTION "audit"."prevent_audit_log_mutation"();

CREATE TRIGGER "audit_logs_no_delete"
BEFORE DELETE ON "audit"."audit_logs"
FOR EACH ROW
EXECUTE FUNCTION "audit"."prevent_audit_log_mutation"();

COMMENT ON TABLE "audit"."audit_logs" IS 'Immutable audit trail. UPDATE/DELETE are blocked at the database level. Retention exceeds the 2-year minimum by design.';

-- CreateIndex
CREATE UNIQUE INDEX "contributors_github_id_key" ON "core"."contributors"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_email_key" ON "core"."contributors"("email");

-- AddForeignKey
ALTER TABLE "audit"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
