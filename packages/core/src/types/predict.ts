/** @format */

import type { Network } from "./network";
import type { Bucket } from "./time";

export type TripStatus = "scheduled" | "active" | "completed";

export interface TripState {
  status: TripStatus;
  lastSeq: number | null;
  lastStopId: string | null;
  /** first event time at lastSeq */
  anchorAt: number | null;
  /** latest event at any stop */
  lastSeenAt: number | null;
}

/** Learned typical seconds for a segment; falls back to the timetable prior. */
export interface Typical {
  (segmentId: string, bucket: Bucket, priorSec: number): number;
}

export interface PredictCtx {
  net: Network;
  typical: Typical;
  tz: string;
  now: number;
}
