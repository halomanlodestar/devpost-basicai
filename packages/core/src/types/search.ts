/** @format */

import type { Stop } from "./network";

/** Ranked stop matches for what the rider has typed so far. */
export interface StopSearch {
  (query: string, limit?: number): Stop[];
}

export interface StopSearchInput {
  q: string;
  limit?: number;
}

export interface StopIdsInput {
  ids: string[];
}
