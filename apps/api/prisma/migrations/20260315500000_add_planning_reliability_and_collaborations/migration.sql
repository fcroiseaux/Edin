-- CreateTable
CREATE TABLE "sprint"."planning_reliability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "sprint_id" TEXT NOT NULL,
    "committed_points" INTEGER NOT NULL DEFAULT 0,
    "delivered_points" INTEGER NOT NULL DEFAULT 0,
    "delivery_ratio" DOUBLE PRECISION,
    "estimation_variance" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planning_reliability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint"."cross_domain_collaborations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sprint_id" TEXT NOT NULL,
    "epic_id" TEXT,
    "domains" TEXT[],
    "contributor_ids" UUID[],
    "collaboration_type" TEXT NOT NULL DEFAULT 'sprint',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_domain_collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planning_reliability_contributor_sprint_uq" ON "sprint"."planning_reliability"("contributor_id", "sprint_id");

-- CreateIndex
CREATE INDEX "planning_reliability_contributor_idx" ON "sprint"."planning_reliability"("contributor_id");

-- CreateIndex
CREATE INDEX "planning_reliability_sprint_idx" ON "sprint"."planning_reliability"("sprint_id");

-- CreateIndex
CREATE UNIQUE INDEX "cross_domain_collab_sprint_epic_type_uq" ON "sprint"."cross_domain_collaborations"("sprint_id", "epic_id", "collaboration_type");

-- CreateIndex
CREATE INDEX "cross_domain_collab_sprint_idx" ON "sprint"."cross_domain_collaborations"("sprint_id");

-- CreateIndex
CREATE INDEX "cross_domain_collab_detected_idx" ON "sprint"."cross_domain_collaborations"("detected_at");
