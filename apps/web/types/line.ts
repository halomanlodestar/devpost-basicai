/** @format */

import type { LineView } from "@app/core/types";

/** What the line view page reads from the live stream. */
export interface LineState {
  data?: LineView | null;
  isPending: boolean;
  isError: boolean;
}
