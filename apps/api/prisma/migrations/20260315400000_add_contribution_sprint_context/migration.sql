-- CreateTable
CREATE TABLE "sprint"."contribution_sprint_context" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "sprint_id" TEXT NOT NULL,
    "story_points" INTEGER,
    "zenhub_issue_id" TEXT NOT NULL,
    "epic_id" TEXT,
    "pipeline_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_sprint_context_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contribution_sprint_context_contribution_sprint_uq" ON "sprint"."contribution_sprint_context"("contribution_id", "sprint_id");

-- CreateIndex
CREATE INDEX "contribution_sprint_context_sprint_idx" ON "sprint"."contribution_sprint_context"("sprint_id");

-- CreateIndex
CREATE INDEX "contribution_sprint_context_contribution_idx" ON "sprint"."contribution_sprint_context"("contribution_id");

-- CreateIndex
CREATE INDEX "contribution_sprint_context_issue_idx" ON "sprint"."contribution_sprint_context"("zenhub_issue_id");

-- AddForeignKey (cross-schema: sprint → core)
ALTER TABLE "sprint"."contribution_sprint_context"
  ADD CONSTRAINT "csc_contribution_id_fk"
  FOREIGN KEY ("contribution_id")
  REFERENCES "core"."contributions"("id")
  ON DELETE CASCADE;
