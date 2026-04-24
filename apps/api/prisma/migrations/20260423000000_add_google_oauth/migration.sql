-- AlterTable: allow contributors to authenticate without a GitHub account.
ALTER TABLE "core"."contributors"
    ALTER COLUMN "github_id" DROP NOT NULL;

ALTER TABLE "core"."contributors"
    ADD COLUMN "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contributors_google_id_key" ON "core"."contributors"("google_id");

-- AddConstraint: every contributor must have at least one OAuth provider linked.
ALTER TABLE "core"."contributors"
    ADD CONSTRAINT "contributors_provider_required"
    CHECK ("github_id" IS NOT NULL OR "google_id" IS NOT NULL);
