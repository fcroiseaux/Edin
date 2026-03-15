-- AlterTable
ALTER TABLE "core"."tasks" ADD COLUMN "zenhub_issue_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_zenhub_issue_id_key" ON "core"."tasks"("zenhub_issue_id");
