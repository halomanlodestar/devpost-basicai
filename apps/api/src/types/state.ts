/** @format */

import type { Network, TripState } from "@app/core/types";

/** In-memory network, trip states and (later) learned stats. Reads never touch Postgres. */
export interface State {
  net: Network;
  /** `${journeyId}@${serviceDate}` → trip state */
  trips: Map<string, TripState>;
}
