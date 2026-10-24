/** @format */

"use client";

import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "@/lib/trpc";
import type { PlanState } from "@/types/plan";

/** Route options for X → Y, live over SSE: first result at once, then on every relevant ticket event. */
export function usePlan(from: string, to: string): PlanState {
  const trpc = useTRPC();
  const sub = useSubscription(
    trpc.plan.watch.subscriptionOptions(
      { from, to },
      { enabled: Boolean(from && to && from !== to) },
    ),
  );
  return {
    data: sub.data,
    isPending: !sub.data && sub.status !== "error",
    isError: !sub.data && sub.status === "error",
    reconnecting: Boolean(sub.data) && sub.status === "connecting",
    refetch: sub.reset,
  };
}
