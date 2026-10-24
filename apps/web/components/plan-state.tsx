/** @format */

"use client";

import type { PlanResult } from "@app/core/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fmtClock } from "@/lib/time";

interface PlanFallbackProps {
  query: {
    isPending: boolean;
    isError: boolean;
    refetch: () => unknown;
    data?: PlanResult;
  };
  from: string;
  to: string;
}

/** Loading / error / empty states shared by Results and Journeys. */
export function PlanFallback({ query, from, to }: PlanFallbackProps) {
  if (query.isPending)
    return (
      <p className="py-10 text-center text-muted-foreground">Finding buses…</p>
    );
  if (query.isError || !query.data)
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="font-medium">Can&apos;t reach live data right now.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => query.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  const r = query.data;
  if (r.kind === "no_route")
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="font-medium">No buses connect these stops.</p>
        {r.reverseServed && (
          <Button
            variant="outline"
            className="mt-4"
            render={
              <Link
                href={`/plan?${new URLSearchParams({ from: to, to: from })}`}
              />
            }
          >
            Buses run the other way. Swap?
          </Button>
        )}
      </div>
    );
  if (r.kind === "no_more_today")
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="font-medium">No more buses today.</p>
        {r.tomorrowFirst && (
          <p className="mt-1 text-sm text-muted-foreground">
            First tomorrow: be at your stop by {fmtClock(r.tomorrowFirst)}
          </p>
        )}
      </div>
    );
  return null;
}
