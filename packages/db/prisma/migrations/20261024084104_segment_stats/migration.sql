-- CreateEnum
CREATE TYPE "stat_bucket" AS ENUM ('am_peak', 'midday', 'pm_peak', 'off', 'all');

-- CreateTable
CREATE TABLE "segment_stat" (
    "segment_id" TEXT NOT NULL,
    "bucket" "stat_bucket" NOT NULL,
    "typical_sec" DOUBLE PRECISION NOT NULL,
    "samples" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "segment_stat_pkey" PRIMARY KEY ("segment_id","bucket")
);

-- AddForeignKey
ALTER TABLE "segment_stat" ADD CONSTRAINT "segment_stat_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
