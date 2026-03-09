-- CreateEnum
CREATE TYPE "core"."FeedbackStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'REASSIGNED', 'UNASSIGNED');

-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE 'FEEDBACK_ASSIGNED';

-- CreateTable
CREATE TABLE "core"."peer_feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "status" "core"."FeedbackStatus" NOT NULL DEFAULT 'ASSIGNED',
    "ratings" JSONB,
    "comments" TEXT,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "reassigned_at" TIMESTAMP(3),
    "reassign_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedbacks_contribution_reviewer_key" ON "core"."peer_feedbacks"("contribution_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "idx_peer_feedback_reviewer_status" ON "core"."peer_feedbacks"("reviewer_id", "status");

-- CreateIndex
CREATE INDEX "idx_peer_feedback_contribution" ON "core"."peer_feedbacks"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_peer_feedback_status_assigned" ON "core"."peer_feedbacks"("status", "assigned_at");

-- AddForeignKey
ALTER TABLE "core"."peer_feedbacks" ADD CONSTRAINT "peer_feedbacks_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "core"."contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."peer_feedbacks" ADD CONSTRAINT "peer_feedbacks_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
