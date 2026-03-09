-- Create EvaluationReviewStatus enum
CREATE TYPE "evaluation"."EvaluationReviewStatus" AS ENUM ('PENDING', 'CONFIRMED', 'OVERRIDDEN');

-- Add new notification types
ALTER TYPE "core"."NotificationType" ADD VALUE IF NOT EXISTS 'EVALUATION_REVIEW_FLAGGED';
ALTER TYPE "core"."NotificationType" ADD VALUE IF NOT EXISTS 'EVALUATION_REVIEW_RESOLVED';

-- Create evaluation_reviews table
CREATE TABLE "evaluation"."evaluation_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "status" "evaluation"."EvaluationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "flag_reason" TEXT NOT NULL,
    "review_reason" TEXT,
    "original_scores" JSONB NOT NULL,
    "override_scores" JSONB,
    "override_narrative" TEXT,
    "flagged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_reviews_pkey" PRIMARY KEY ("id")
);

-- Create unique index on evaluation_id (one review per evaluation)
CREATE UNIQUE INDEX "evaluation_reviews_evaluation_id_key" ON "evaluation"."evaluation_reviews"("evaluation_id");

-- Create index for review queue queries
CREATE INDEX "idx_evaluation_reviews_status_flagged" ON "evaluation"."evaluation_reviews"("status", "flagged_at");

-- Add foreign key constraints
ALTER TABLE "evaluation"."evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluation"."evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation"."evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation"."evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
