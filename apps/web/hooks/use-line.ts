/** @format */

"use client";

import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "@/lib/trpc";
import type { LineState } from "@/types/line";

/** One bus line end to end, live over SSE: buses move as tickets come in. */
export function useLine(routeId: string, journeyId?: string): LineState {
  const trpc = useTRPC();
  const sub = useSubscription(
    trpc.line.watch.subscriptionOptions(
      { routeId, journeyId },
      { enabled: Boolean(routeId) },
    ),
  );

  return {
    data: sub.data,
    isPending: sub.data === undefined && sub.status !== "error",
    isError: sub.data === undefined && sub.status === "error",
  };
}
