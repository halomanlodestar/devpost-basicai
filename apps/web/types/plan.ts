/** @format */

import type { PlanResult } from "@app/core/types";

/** What Results and Journeys read from the live X → Y stream. */
export interface PlanState {
  data?: PlanResult;
  isPending: boolean;
  isError: boolean;
  /** the stream dropped; rows keep their last values until it's back */
  reconnecting: boolean;
  refetch: () => void;
}
