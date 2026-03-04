-- DropIndex
DROP INDEX "micro_tasks_domain_key";

-- AlterTable
ALTER TABLE "micro_tasks" ADD COLUMN "deactivated_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "micro_tasks_one_active_per_domain"
ON "micro_tasks"("domain")
WHERE "is_active" = true;
