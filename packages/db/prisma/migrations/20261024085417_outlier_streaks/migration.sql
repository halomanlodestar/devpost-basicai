-- AlterTable
ALTER TABLE "segment_stat" ADD COLUMN     "pending_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pending_mean_sec" DOUBLE PRECISION NOT NULL DEFAULT 0;
