/** @format */

import type {
  Network,
  SegmentStat,
  StopSearch,
  TripState,
} from "@app/core/types";

/** In-memory network, trip states and learned stats. Reads never touch Postgres. */
export interface State {
  net: Network;
  /** `${journeyId}@${serviceDate}` → trip state */
  trips: Map<string, TripState>;
  /** `${segmentId}:${bucket}` → learned typical time */
  stats: Map<string, SegmentStat>;
  /** fuzzy stop-name search over the network (stops are static during a run) */
  searchStops: StopSearch;
}
