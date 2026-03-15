-- CreateTable
CREATE TABLE "sprint"."sprint_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sprint_id" TEXT NOT NULL,
    "sprint_name" TEXT NOT NULL,
    "sprint_start" TIMESTAMP(3) NOT NULL,
    "sprint_end" TIMESTAMP(3) NOT NULL,
    "domain" TEXT,
    "velocity" INTEGER NOT NULL DEFAULT 0,
    "committed_points" INTEGER NOT NULL DEFAULT 0,
    "delivered_points" INTEGER NOT NULL DEFAULT 0,
    "burndown_data" JSONB,
    "cycle_time_avg" DOUBLE PRECISION,
    "lead_time_avg" DOUBLE PRECISION,
    "scope_changes" INTEGER NOT NULL DEFAULT 0,
    "estimation_accuracy" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprint_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint"."pipeline_transitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sprint_metric_id" UUID NOT NULL,
    "issue_id" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "from_pipeline" TEXT NOT NULL,
    "to_pipeline" TEXT NOT NULL,
    "story_points" INTEGER,
    "contributor_id" UUID,
    "transitioned_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sprint_metrics_sprint_domain_uq" ON "sprint"."sprint_metrics"("sprint_id", "domain");

-- CreateIndex
CREATE INDEX "sprint_metrics_sprint_end_domain_idx" ON "sprint"."sprint_metrics"("sprint_end", "domain");

-- CreateIndex
CREATE INDEX "pipeline_transitions_sprint_transitioned_idx" ON "sprint"."pipeline_transitions"("sprint_metric_id", "transitioned_at");

-- CreateIndex
CREATE INDEX "pipeline_transitions_issue_idx" ON "sprint"."pipeline_transitions"("issue_id");

-- AddForeignKey
ALTER TABLE "sprint"."pipeline_transitions" ADD CONSTRAINT "pipeline_transitions_sprint_metric_id_fkey" FOREIGN KEY ("sprint_metric_id") REFERENCES "sprint"."sprint_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
