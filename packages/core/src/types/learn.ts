/** @format */

import type { Bucket } from "./time";

/** Per-bucket rows plus an `all` row updated on every sample. */
export type StatBucket = Bucket | "all";

export interface SegmentStat {
  typicalSec: number;
  samples: number;
  /** outliers seen and ignored */
  rejected: number;
  /** consecutive outliers on the same side (all slower or all faster) */
  pendingCount: number;
  /** their running mean: becomes the new normal if the streak reaches SHIFT_AFTER */
  pendingMeanSec: number;
}

export interface StatsStore {
  get(segmentId: string, bucket: StatBucket): SegmentStat | undefined;
  set(segmentId: string, bucket: StatBucket, stat: SegmentStat): void;
}

/** A trip moved from stop `fromSeq` (anchored at `fromAt`) to its first event at `toSeq`. */
export interface Advance {
  journeyId: string;
  fromSeq: number;
  fromAt: number;
  toSeq: number;
  toAt: number;
}

export interface LearnedSample {
  segmentId: string;
  bucket: StatBucket;
  sampleSec: number;
  accepted: boolean;
}
