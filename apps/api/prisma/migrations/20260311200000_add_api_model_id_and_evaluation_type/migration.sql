-- Add api_model_id and evaluation_type columns to evaluation_models
ALTER TABLE "evaluation"."evaluation_models" ADD COLUMN "api_model_id" TEXT;
ALTER TABLE "evaluation"."evaluation_models" ADD COLUMN "evaluation_type" TEXT;

-- Backfill existing rows
UPDATE "evaluation"."evaluation_models"
SET "api_model_id" = COALESCE(
  config->>'modelId',
  'claude-sonnet-4-5-20250514'
),
"evaluation_type" = CASE
  WHEN "name" LIKE 'code-evaluator%' THEN 'CODE'
  WHEN "name" LIKE 'doc-evaluator%' THEN 'DOCUMENTATION'
  ELSE 'CODE'
END;

-- Make columns NOT NULL after backfill
ALTER TABLE "evaluation"."evaluation_models" ALTER COLUMN "api_model_id" SET NOT NULL;
ALTER TABLE "evaluation"."evaluation_models" ALTER COLUMN "evaluation_type" SET NOT NULL;

-- Drop old unique constraint and create new one
ALTER TABLE "evaluation"."evaluation_models" DROP CONSTRAINT IF EXISTS "evaluation_models_name_version_key";
ALTER TABLE "evaluation"."evaluation_models" ADD CONSTRAINT "evaluation_models_api_model_id_version_evaluation_type_key" UNIQUE ("api_model_id", "version", "evaluation_type");

-- Add index for registry lookup
CREATE INDEX "evaluation_models_evaluation_type_status_idx" ON "evaluation"."evaluation_models" ("evaluation_type", "status");
