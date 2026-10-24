/** @format */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";

/** Route options for X → Y. Polls for now; becomes the live subscription in slice 2. */
export function usePlan(from: string, to: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.plan.search.queryOptions({ from, to }),
    enabled: Boolean(from && to && from !== to),
    refetchInterval: 30_000,
  });
}
