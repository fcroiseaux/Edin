-- AlterTable
ALTER TABLE "contributors" ADD COLUMN     "skill_areas" TEXT[] DEFAULT ARRAY[]::TEXT[];
