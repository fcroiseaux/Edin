-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "evaluation";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "publication";

-- CreateEnum
CREATE TYPE "ContributorRole" AS ENUM ('PUBLIC', 'APPLICANT', 'CONTRIBUTOR', 'EDITOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContributorDomain" AS ENUM ('Technology', 'Fintech', 'Impact', 'Governance');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReviewRecommendation" AS ENUM ('APPROVE', 'REQUEST_MORE_INFO', 'DECLINE');

-- CreateEnum
CREATE TYPE "OnboardingMilestoneType" AS ENUM ('ACCOUNT_ACTIVATED', 'BUDDY_ASSIGNED', 'FIRST_TASK_VIEWED', 'FIRST_TASK_CLAIMED', 'FIRST_CONTRIBUTION_SUBMITTED');

-- CreateEnum
CREATE TYPE "RepositoryStatus" AS ENUM ('ACTIVE', 'PENDING', 'ERROR', 'REMOVING');

-- CreateEnum
CREATE TYPE "ContributionSource" AS ENUM ('GITHUB');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('COMMIT', 'PULL_REQUEST', 'CODE_REVIEW', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('INGESTED', 'ATTRIBUTED', 'UNATTRIBUTED', 'EVALUATED');

-- CreateEnum
CREATE TYPE "CollaborationRole" AS ENUM ('PRIMARY_AUTHOR', 'CO_AUTHOR', 'COMMITTER', 'ISSUE_ASSIGNEE');

-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('DETECTED', 'CONFIRMED', 'DISPUTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('AVAILABLE', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TaskDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('CONTRIBUTION_NEW', 'EVALUATION_COMPLETED', 'ANNOUNCEMENT_CREATED', 'MEMBER_JOINED', 'TASK_COMPLETED', 'FEEDBACK_ASSIGNED', 'FEEDBACK_SUBMITTED', 'FEEDBACK_REASSIGNED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'REASSIGNED', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVALUATION_COMPLETED', 'EVALUATION_REVIEW_FLAGGED', 'EVALUATION_REVIEW_RESOLVED', 'PEER_FEEDBACK_AVAILABLE', 'PEER_FEEDBACK_RECEIVED', 'ANNOUNCEMENT_POSTED', 'CONTRIBUTION_TO_DOMAIN', 'TASK_ASSIGNED', 'ARTICLE_FEEDBACK', 'ARTICLE_PUBLISHED', 'EDITOR_APPLICATION_SUBMITTED', 'ROLE_CHANGED');

-- CreateEnum
CREATE TYPE "evaluation"."EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "evaluation"."EvaluationModelStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "evaluation"."EvaluationReviewStatus" AS ENUM ('PENDING', 'CONFIRMED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "publication"."ArticleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'EDITORIAL_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "publication"."EditorialDecision" AS ENUM ('APPROVE', 'REQUEST_REVISIONS', 'REJECT');

-- CreateEnum
CREATE TYPE "publication"."EditorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "evaluation"."TemporalHorizon" AS ENUM ('SESSION', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "evaluation"."ScoreTrend" AS ENUM ('RISING', 'STABLE', 'DECLINING');

-- CreateTable
CREATE TABLE "contributors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "github_id" INTEGER NOT NULL,
    "github_username" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "bio" VARCHAR(500),
    "avatar_url" TEXT,
    "domain" "ContributorDomain",
    "skill_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role" "ContributorRole" NOT NULL DEFAULT 'PUBLIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "buddy_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "show_evaluation_scores" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicant_name" TEXT NOT NULL,
    "applicant_email" TEXT NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "statement_of_interest" VARCHAR(300) NOT NULL,
    "micro_task_domain" "ContributorDomain" NOT NULL,
    "micro_task_response" TEXT NOT NULL,
    "micro_task_submission_url" TEXT,
    "gdpr_consent_version" TEXT NOT NULL,
    "gdpr_consented_at" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "contributor_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "ignition_started_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "micro_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" "ContributorDomain" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expected_deliverable" TEXT NOT NULL,
    "estimated_effort" TEXT NOT NULL,
    "submission_format" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buddy_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "buddy_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "buddy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "milestone_type" "OnboardingMilestoneType" NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "onboarding_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_repositories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "webhook_id" INTEGER,
    "webhook_secret" TEXT NOT NULL,
    "status" "RepositoryStatus" NOT NULL DEFAULT 'PENDING',
    "status_message" TEXT,
    "added_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID,
    "task_id" UUID,
    "repository_id" UUID NOT NULL,
    "source" "ContributionSource" NOT NULL DEFAULT 'GITHUB',
    "source_ref" TEXT NOT NULL,
    "contribution_type" "ContributionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "raw_data" JSONB NOT NULL,
    "normalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ContributionStatus" NOT NULL DEFAULT 'INGESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_collaborations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "role" "CollaborationRole" NOT NULL,
    "split_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'DETECTED',
    "detection_source" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "dispute_comment" TEXT,
    "overridden_by_id" UUID,
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" TEXT NOT NULL,
    "repository_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "accent_color" TEXT NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "lead_contributor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "working_group_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "working_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "working_group_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "difficulty" "TaskDifficulty" NOT NULL,
    "estimated_effort" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "claimed_by_id" UUID,
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" "ActivityEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contributor_id" UUID NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "contribution_type" "ContributionType",
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entity_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'ASSIGNED',
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

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit"."audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "previous_state" JSONB,
    "new_state" JSONB,
    "reason" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "consent_version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."data_export_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "download_url" TEXT,
    "file_name" TEXT,
    "correlation_id" TEXT,
    "error_message" TEXT,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."data_deletion_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cooling_off_ends_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "pseudonym_id" TEXT,
    "correlation_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."compliance_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'json',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legal_reviewed_at" TIMESTAMP(3),
    "legal_reviewed_by" UUID,
    "review_notes" TEXT,
    "retired_at" TIMESTAMP(3),
    "related_model_id" TEXT,
    "correlation_id" TEXT,

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" TEXT NOT NULL,
    "abstract" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "status" "publication"."ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "editor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."article_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."editorial_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "editor_id" UUID NOT NULL,
    "decision" "publication"."EditorialDecision" NOT NULL,
    "overall_assessment" TEXT NOT NULL,
    "revision_requests" JSONB,
    "article_version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."inline_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feedback_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "editor_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "highlight_start" INTEGER NOT NULL,
    "highlight_end" INTEGER NOT NULL,
    "article_version" INTEGER NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inline_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."editor_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "status" "publication"."EditorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "application_statement" VARCHAR(300) NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."editor_eligibility_criteria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" "ContributorDomain" NOT NULL,
    "min_contribution_count" INTEGER NOT NULL DEFAULT 10,
    "min_governance_weight" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "max_concurrent_assignments" INTEGER NOT NULL DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "editor_eligibility_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."article_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referral_source" TEXT,
    "time_on_page_seconds" INTEGER,
    "scroll_depth_percent" INTEGER,
    "visitor_hash" VARCHAR(16) NOT NULL,

    CONSTRAINT "article_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."article_reward_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "evaluation_id" UUID,
    "composite_score" DECIMAL(5,2),
    "author_id" UUID NOT NULL,
    "editor_id" UUID,
    "author_share_percent" INTEGER NOT NULL DEFAULT 80,
    "editor_share_percent" INTEGER NOT NULL DEFAULT 20,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_reward_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."moderation_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "plagiarism_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ai_content_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "flag_type" VARCHAR(50),
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagged_passages" JSONB,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "admin_id" UUID,
    "admin_action" VARCHAR(50),
    "admin_reason" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."evaluation_models" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB,
    "config_hash" TEXT,
    "status" "evaluation"."EvaluationModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "deployed_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "evaluation"."evaluations" (
    "id" UUID NOT NULL,
    "contribution_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "model_id" UUID,
    "rubric_id" UUID,
    "status" "evaluation"."EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "composite_score" DECIMAL(5,2),
    "dimension_scores" JSONB,
    "narrative" TEXT,
    "formula_version" TEXT,
    "raw_inputs" JSONB,
    "metadata" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "evaluation"."scoring_formula_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" SERIAL NOT NULL,
    "ai_eval_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.40,
    "peer_feedback_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.25,
    "complexity_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.20,
    "domain_norm_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.15,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_formula_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."contribution_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "composite_score" DECIMAL(5,2) NOT NULL,
    "ai_eval_score" DECIMAL(5,2) NOT NULL,
    "peer_feedback_score" DECIMAL(5,2),
    "complexity_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "domain_norm_factor" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "formula_version_id" UUID NOT NULL,
    "raw_inputs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."temporal_score_aggregates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "horizon" "evaluation"."TemporalHorizon" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "aggregated_score" DECIMAL(5,2) NOT NULL,
    "contribution_count" INTEGER NOT NULL DEFAULT 0,
    "trend" "evaluation"."ScoreTrend" NOT NULL DEFAULT 'STABLE',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temporal_score_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contributors_github_id_key" ON "contributors"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_github_username_key" ON "contributors"("github_username");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_email_key" ON "contributors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicant_email_key" ON "applications"("applicant_email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_milestones_contributor_type_key" ON "onboarding_milestones"("contributor_id", "milestone_type");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_repositories_full_name_key" ON "monitored_repositories"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "monitored_repositories_owner_repo_key" ON "monitored_repositories"("owner", "repo");

-- CreateIndex
CREATE INDEX "contributions_contributor_created_idx" ON "contributions"("contributor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contributions_task_id_idx" ON "contributions"("task_id");

-- CreateIndex
CREATE INDEX "contributions_repo_type_idx" ON "contributions"("repository_id", "contribution_type");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_source_repo_ref_key" ON "contributions"("source", "repository_id", "source_ref");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_contribution" ON "contribution_collaborations"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_contributor" ON "contribution_collaborations"("contributor_id");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_current" ON "contribution_collaborations"("contribution_id", "is_current");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_status" ON "contribution_collaborations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_collaborations_current_key" ON "contribution_collaborations"("contribution_id", "contributor_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_delivery_id_key" ON "webhook_deliveries"("delivery_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_repo_idx" ON "webhook_deliveries"("repository_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_groups_name_key" ON "working_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "working_groups_domain_key" ON "working_groups"("domain");

-- CreateIndex
CREATE INDEX "idx_working_group_members_contributor_id" ON "working_group_members"("contributor_id");

-- CreateIndex
CREATE INDEX "idx_working_group_members_working_group_id" ON "working_group_members"("working_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_group_members_group_contributor_key" ON "working_group_members"("working_group_id", "contributor_id");

-- CreateIndex
CREATE INDEX "idx_announcements_working_group_id_created_at" ON "announcements"("working_group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_tasks_domain_status" ON "tasks"("domain", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_domain_sort_order" ON "tasks"("domain", "sort_order");

-- CreateIndex
CREATE INDEX "idx_tasks_claimed_by_id" ON "tasks"("claimed_by_id");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_created_by_id" ON "tasks"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_activity_events_created_at" ON "activity_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_events_domain_created_at" ON "activity_events"("domain", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_events_contributor_id" ON "activity_events"("contributor_id");

-- CreateIndex
CREATE INDEX "idx_notifications_contributor_unread" ON "notifications"("contributor_id", "read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_contributor_created" ON "notifications"("contributor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_contributor_category" ON "notifications"("contributor_id", "category", "read");

-- CreateIndex
CREATE INDEX "idx_peer_feedback_reviewer_status" ON "peer_feedbacks"("reviewer_id", "status");

-- CreateIndex
CREATE INDEX "idx_peer_feedback_contribution" ON "peer_feedbacks"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_peer_feedback_status_assigned" ON "peer_feedbacks"("status", "assigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedbacks_contribution_reviewer_key" ON "peer_feedbacks"("contribution_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit"."audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit"."audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit"."audit_logs"("correlation_id");

-- CreateIndex
CREATE INDEX "idx_data_export_contributor_requested" ON "audit"."data_export_requests"("contributor_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "idx_data_export_status" ON "audit"."data_export_requests"("status");

-- CreateIndex
CREATE INDEX "idx_data_deletion_contributor_requested" ON "audit"."data_deletion_requests"("contributor_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "idx_data_deletion_status_cooling" ON "audit"."data_deletion_requests"("status", "cooling_off_ends_at");

-- CreateIndex
CREATE INDEX "idx_compliance_doc_type_version" ON "audit"."compliance_documents"("document_type", "version" DESC);

-- CreateIndex
CREATE INDEX "idx_compliance_doc_generated" ON "audit"."compliance_documents"("generated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "publication"."articles"("slug");

-- CreateIndex
CREATE INDEX "idx_articles_author_id_status" ON "publication"."articles"("author_id", "status");

-- CreateIndex
CREATE INDEX "idx_articles_editor_id_status" ON "publication"."articles"("editor_id", "status");

-- CreateIndex
CREATE INDEX "idx_articles_domain_status" ON "publication"."articles"("domain", "status");

-- CreateIndex
CREATE INDEX "idx_articles_status_published_at" ON "publication"."articles"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_article_versions_article_version" ON "publication"."article_versions"("article_id", "version_number");

-- CreateIndex
CREATE INDEX "idx_editorial_feedback_article_id" ON "publication"."editorial_feedback"("article_id");

-- CreateIndex
CREATE INDEX "idx_inline_comments_article_id_version" ON "publication"."inline_comments"("article_id", "article_version");

-- CreateIndex
CREATE INDEX "idx_editor_application_status" ON "publication"."editor_applications"("status");

-- CreateIndex
CREATE INDEX "idx_editor_application_contributor_id" ON "publication"."editor_applications"("contributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "editor_applications_contributor_domain_key" ON "publication"."editor_applications"("contributor_id", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "editor_eligibility_criteria_domain_key" ON "publication"."editor_eligibility_criteria"("domain");

-- CreateIndex
CREATE INDEX "idx_article_views_article_viewed_at" ON "publication"."article_views"("article_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_article_views_dedup" ON "publication"."article_views"("article_id", "visitor_hash");

-- CreateIndex
CREATE UNIQUE INDEX "article_reward_allocations_article_id_key" ON "publication"."article_reward_allocations"("article_id");

-- CreateIndex
CREATE INDEX "idx_article_reward_author" ON "publication"."article_reward_allocations"("author_id");

-- CreateIndex
CREATE INDEX "idx_article_reward_editor" ON "publication"."article_reward_allocations"("editor_id");

-- CreateIndex
CREATE INDEX "idx_moderation_reports_article_id" ON "publication"."moderation_reports"("article_id");

-- CreateIndex
CREATE INDEX "idx_moderation_reports_flagged_status" ON "publication"."moderation_reports"("is_flagged", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_models_name_version_key" ON "evaluation"."evaluation_models"("name", "version");

-- CreateIndex
CREATE INDEX "idx_rubrics_type_active" ON "evaluation"."evaluation_rubrics"("evaluation_type", "is_active");

-- CreateIndex
CREATE INDEX "idx_evaluations_contributor_created" ON "evaluation"."evaluations"("contributor_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_evaluations_status" ON "evaluation"."evaluations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_contribution_id_key" ON "evaluation"."evaluations"("contribution_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_reviews_evaluation_id_key" ON "evaluation"."evaluation_reviews"("evaluation_id");

-- CreateIndex
CREATE INDEX "idx_evaluation_reviews_status_flagged" ON "evaluation"."evaluation_reviews"("status", "flagged_at");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_scores_contribution_id_key" ON "evaluation"."contribution_scores"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_contribution_scores_contributor_created" ON "evaluation"."contribution_scores"("contributor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_temporal_aggregates_contributor_horizon_period" ON "evaluation"."temporal_score_aggregates"("contributor_id", "horizon", "period_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "temporal_score_aggregates_contributor_horizon_period_key" ON "evaluation"."temporal_score_aggregates"("contributor_id", "horizon", "period_start");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buddy_assignments" ADD CONSTRAINT "buddy_assignments_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buddy_assignments" ADD CONSTRAINT "buddy_assignments_buddy_id_fkey" FOREIGN KEY ("buddy_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_milestones" ADD CONSTRAINT "onboarding_milestones_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitored_repositories" ADD CONSTRAINT "monitored_repositories_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "monitored_repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_collaborations" ADD CONSTRAINT "contribution_collaborations_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_collaborations" ADD CONSTRAINT "contribution_collaborations_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_collaborations" ADD CONSTRAINT "contribution_collaborations_overridden_by_id_fkey" FOREIGN KEY ("overridden_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "monitored_repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_groups" ADD CONSTRAINT "working_groups_lead_contributor_id_fkey" FOREIGN KEY ("lead_contributor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_group_members" ADD CONSTRAINT "working_group_members_working_group_id_fkey" FOREIGN KEY ("working_group_id") REFERENCES "working_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_group_members" ADD CONSTRAINT "working_group_members_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_working_group_id_fkey" FOREIGN KEY ("working_group_id") REFERENCES "working_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_feedbacks" ADD CONSTRAINT "peer_feedbacks_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_feedbacks" ADD CONSTRAINT "peer_feedbacks_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."data_export_requests" ADD CONSTRAINT "data_export_requests_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."compliance_documents" ADD CONSTRAINT "compliance_documents_legal_reviewed_by_fkey" FOREIGN KEY ("legal_reviewed_by") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."articles" ADD CONSTRAINT "articles_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_versions" ADD CONSTRAINT "article_versions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_versions" ADD CONSTRAINT "article_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editorial_feedback" ADD CONSTRAINT "editorial_feedback_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editorial_feedback" ADD CONSTRAINT "editorial_feedback_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."inline_comments" ADD CONSTRAINT "inline_comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "publication"."editorial_feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."inline_comments" ADD CONSTRAINT "inline_comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."inline_comments" ADD CONSTRAINT "inline_comments_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_applications" ADD CONSTRAINT "editor_applications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_applications" ADD CONSTRAINT "editor_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_applications" ADD CONSTRAINT "editor_applications_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_eligibility_criteria" ADD CONSTRAINT "editor_eligibility_criteria_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_views" ADD CONSTRAINT "article_views_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_reward_allocations" ADD CONSTRAINT "article_reward_allocations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_reward_allocations" ADD CONSTRAINT "article_reward_allocations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_reward_allocations" ADD CONSTRAINT "article_reward_allocations_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."moderation_reports" ADD CONSTRAINT "moderation_reports_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."moderation_reports" ADD CONSTRAINT "moderation_reports_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "evaluation"."evaluation_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "evaluation"."evaluation_rubrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluation"."evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."contribution_scores" ADD CONSTRAINT "contribution_scores_formula_version_id_fkey" FOREIGN KEY ("formula_version_id") REFERENCES "evaluation"."scoring_formula_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

