/** @format */

import type { Network, SegmentStat, TripState } from "@app/core/types";

/** In-memory network, trip states and (later) learned stats. Reads never touch Postgres. */
export interface State {
  net: Network;
  /** `${journeyId}@${serviceDate}` → trip state */
  trips: Map<string, TripState>;
  /** `${segmentId}:${bucket}` → learned typical time */
  stats: Map<string, SegmentStat>;
}
