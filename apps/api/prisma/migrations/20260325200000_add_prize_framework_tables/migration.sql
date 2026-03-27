-- CreateEnum
CREATE TYPE "core"."ChannelType" AS ENUM ('DOMAIN', 'WORKING_GROUP', 'CROSS_DOMAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "core"."PrizeDetectionType" AS ENUM ('AUTOMATED', 'COMMUNITY_NOMINATED');

-- CreateTable
CREATE TABLE "core"."channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "core"."ChannelType" NOT NULL,
    "parent_channel_id" UUID,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channels_name_key" ON "core"."channels"("name");

-- CreateIndex
CREATE INDEX "idx_channels_type" ON "core"."channels"("type");

-- CreateIndex
CREATE INDEX "idx_channels_parent_channel_id" ON "core"."channels"("parent_channel_id");

-- AddForeignKey (self-referencing hierarchy)
ALTER TABLE "core"."channels" ADD CONSTRAINT "channels_parent_channel_id_fkey" FOREIGN KEY ("parent_channel_id") REFERENCES "core"."channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "core"."prize_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channel_id" UUID,
    "detection_type" "core"."PrizeDetectionType" NOT NULL,
    "threshold_config" JSONB NOT NULL,
    "scaling_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prize_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prize_categories_name_key" ON "core"."prize_categories"("name");

-- CreateIndex
CREATE INDEX "idx_prize_categories_channel_id" ON "core"."prize_categories"("channel_id");

-- CreateIndex
CREATE INDEX "idx_prize_categories_detection_type" ON "core"."prize_categories"("detection_type");

-- AddForeignKey
ALTER TABLE "core"."prize_categories" ADD CONSTRAINT "prize_categories_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "core"."channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "core"."prize_awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prize_category_id" UUID NOT NULL,
    "recipient_contributor_id" UUID NOT NULL,
    "contribution_id" UUID,
    "significance_level" INTEGER NOT NULL,
    "channel_id" UUID NOT NULL,
    "chatham_house_label" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "prize_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_prize_awards_category_awarded" ON "core"."prize_awards"("prize_category_id", "awarded_at" DESC);

-- CreateIndex
CREATE INDEX "idx_prize_awards_recipient_awarded" ON "core"."prize_awards"("recipient_contributor_id", "awarded_at" DESC);

-- CreateIndex
CREATE INDEX "idx_prize_awards_channel_id" ON "core"."prize_awards"("channel_id");

-- CreateIndex
CREATE INDEX "idx_prize_awards_contribution_id" ON "core"."prize_awards"("contribution_id");

-- AddForeignKey
ALTER TABLE "core"."prize_awards" ADD CONSTRAINT "prize_awards_prize_category_id_fkey" FOREIGN KEY ("prize_category_id") REFERENCES "core"."prize_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."prize_awards" ADD CONSTRAINT "prize_awards_recipient_contributor_id_fkey" FOREIGN KEY ("recipient_contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."prize_awards" ADD CONSTRAINT "prize_awards_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "core"."contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."prize_awards" ADD CONSTRAINT "prize_awards_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "core"."channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
