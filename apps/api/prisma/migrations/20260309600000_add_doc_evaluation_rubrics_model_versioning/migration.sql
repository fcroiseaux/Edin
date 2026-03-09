-- Add DOCUMENTATION to ContributionType enum
ALTER TYPE "core"."ContributionType" ADD VALUE IF NOT EXISTS 'DOCUMENTATION';

-- Add new columns to evaluation_models
ALTER TABLE "evaluation"."evaluation_models" ADD COLUMN "config_hash" TEXT;
ALTER TABLE "evaluation"."evaluation_models" ADD COLUMN "deployed_at" TIMESTAMP(3);
ALTER TABLE "evaluation"."evaluation_models" ADD COLUMN "retired_at" TIMESTAMP(3);

-- Create evaluation_rubrics table
CREATE TABLE "evaluation"."evaluation_rubrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_type" TEXT NOT NULL,
    "document_type" TEXT,
    "parameters" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_rubrics_pkey" PRIMARY KEY ("id")
);

-- Add rubric_id to evaluations
ALTER TABLE "evaluation"."evaluations" ADD COLUMN "rubric_id" UUID;

-- Create indexes
CREATE INDEX "idx_rubrics_type_active" ON "evaluation"."evaluation_rubrics"("evaluation_type", "is_active");

-- Add foreign key constraint
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "evaluation"."evaluation_rubrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
