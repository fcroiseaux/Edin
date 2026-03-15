-- CreateTable
CREATE TABLE "sprint"."zenhub_sync_conflicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_id" UUID,
    "conflict_type" TEXT NOT NULL,
    "affected_entity" TEXT NOT NULL,
    "affected_entity_id" TEXT NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT 'pending',
    "outcome" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zenhub_sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zenhub_sync_conflicts_resolution_occurred_idx" ON "sprint"."zenhub_sync_conflicts"("resolution", "occurred_at");
