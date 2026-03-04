-- CreateEnum
CREATE TYPE "ReviewRecommendation" AS ENUM ('APPROVE', 'REQUEST_MORE_INFO', 'DECLINE');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "decline_reason" TEXT,
ADD COLUMN     "ignition_started_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" UUID;

-- CreateTable
CREATE TABLE "application_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "recommendation" "ReviewRecommendation",
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
