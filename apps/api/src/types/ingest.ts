/** @format */

import type { IngestResponse, TripState, TripStore } from "@app/core/types";

/** The emitter a request was signed by, once its signature checks out. */
export interface VerifiedEmitter {
  id: string;
  busId: string;
}

/** Trip writes made during a batch, applied to memory only after the DB commit. */
export interface OverlayStore extends TripStore {
  changes: Map<string, TripState>;
}

export interface BatchResult {
  response: IngestResponse;
  /** routes whose trips changed: the hub recomputes pairs riding on them */
  routeIds: Set<string>;
}
