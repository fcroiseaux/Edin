-- CreateEnum
CREATE TYPE "core"."RepositoryStatus" AS ENUM ('ACTIVE', 'PENDING', 'ERROR', 'REMOVING');

-- CreateTable
CREATE TABLE "core"."monitored_repositories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "webhook_id" INTEGER,
    "webhook_secret" TEXT NOT NULL,
    "status" "core"."RepositoryStatus" NOT NULL DEFAULT 'PENDING',
    "status_message" TEXT,
    "added_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monitored_repositories_full_name_key" ON "core"."monitored_repositories"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_repositories_owner_repo_key" ON "core"."monitored_repositories"("owner", "repo");

-- AddForeignKey
ALTER TABLE "core"."monitored_repositories" ADD CONSTRAINT "monitored_repositories_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
