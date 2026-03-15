-- CreateEnum
CREATE TYPE "sprint"."ScopeChangeType" AS ENUM ('ADDED', 'REMOVED');

-- CreateTable
CREATE TABLE "sprint"."scope_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sprint_metric_id" UUID NOT NULL,
    "issue_id" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "change_type" "sprint"."ScopeChangeType" NOT NULL,
    "story_points" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scope_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint"."contributor_sprint_estimations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sprint_metric_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "planned_points" INTEGER NOT NULL DEFAULT 0,
    "delivered_points" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributor_sprint_estimations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scope_changes_sprint_changed_idx" ON "sprint"."scope_changes"("sprint_metric_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "contributor_sprint_estimation_sprint_contributor_uq" ON "sprint"."contributor_sprint_estimations"("sprint_metric_id", "contributor_id");

-- CreateIndex
CREATE INDEX "contributor_sprint_estimation_contributor_idx" ON "sprint"."contributor_sprint_estimations"("contributor_id");

-- AddForeignKey
ALTER TABLE "sprint"."scope_changes" ADD CONSTRAINT "scope_changes_sprint_metric_id_fkey" FOREIGN KEY ("sprint_metric_id") REFERENCES "sprint"."sprint_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint"."contributor_sprint_estimations" ADD CONSTRAINT "contributor_sprint_estimations_sprint_metric_id_fkey" FOREIGN KEY ("sprint_metric_id") REFERENCES "sprint"."sprint_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
