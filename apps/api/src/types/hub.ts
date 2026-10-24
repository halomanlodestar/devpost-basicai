/** @format */

import type { PlanResult } from "@app/core/types";

/** One open `plan.watch` stream. */
export interface Subscriber {
  /** a newer result is waiting to be sent */
  dirty: boolean;
  wake: (() => void) | null;
}

/** All streams watching one (from, to) pair, sharing one computed result. */
export interface WatchedPair {
  from: string;
  to: string;
  routeIds: Set<string>;
  subs: Set<Subscriber>;
  latest: PlanResult | null;
}
