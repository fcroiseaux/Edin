-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sprint";

-- CreateEnum
CREATE TYPE "sprint"."ZenhubSyncType" AS ENUM ('WEBHOOK', 'POLL', 'BACKFILL');

-- CreateEnum
CREATE TYPE "sprint"."ZenhubSyncStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "sprint"."zenhub_syncs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" TEXT NOT NULL,
    "sync_type" "sprint"."ZenhubSyncType" NOT NULL,
    "status" "sprint"."ZenhubSyncStatus" NOT NULL DEFAULT 'RECEIVED',
    "event_type" TEXT NOT NULL,
    "payload" JSONB,
    "correlation_id" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zenhub_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zenhub_syncs_delivery_id_key" ON "sprint"."zenhub_syncs"("delivery_id");

-- CreateIndex
CREATE INDEX "zenhub_syncs_type_status_idx" ON "sprint"."zenhub_syncs"("sync_type", "status");

-- CreateIndex
CREATE INDEX "zenhub_syncs_received_at_idx" ON "sprint"."zenhub_syncs"("received_at");
