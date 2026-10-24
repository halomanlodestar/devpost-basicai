/** @format */

"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LateBadge } from "@/components/late-badge";
import { PlanHeader } from "@/components/plan-header";
import { PlanFallback } from "@/components/plan-state";
import { useNow } from "@/hooks/use-now";
import { usePlan } from "@/hooks/use-plan";
import { fmtClock, fmtDuration } from "@/lib/time";

export function Results() {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const query = usePlan(from, to);
  const now = useNow();
  const qs = new URLSearchParams({ from, to });

  return (
    <>
      <PlanHeader
        from={from}
        to={to}
        back="/"
        reconnecting={query.reconnecting}
      />
      {query.data?.kind === "ok" ? (
        <ul className="space-y-3">
          {query.data.options.map((o) => (
            <li key={o.id}>
              <Link
                href={`/plan/${encodeURIComponent(o.id)}?${qs}`}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  {o.next.overdue ? (
                    <>
                      <p className="text-base font-medium text-muted-foreground">
                        No report from the next bus yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Bus {o.routes.map((r) => r.split(" · ")[0]).join(" → ")}{" "}
                        · was due at {o.next.legs[0]!.boardStopName}{" "}
                        {fmtClock(o.next.expectedX)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums">
                          {fmtDuration(o.next.arriveBy - now)}
                        </span>
                        <span className="min-w-0 truncate text-sm text-muted-foreground">
                          reaches {o.next.legs.at(-1)!.alightStopName} by{" "}
                          <span className="text-foreground tabular-nums">
                            {fmtClock(o.next.arriveBy)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                        <span>
                          Bus{" "}
                          {o.routes.map((r) => r.split(" · ")[0]).join(" → ")}
                        </span>
                        {o.changes > 0 && (
                          <span>
                            · {o.changes} change{o.changes > 1 ? "s" : ""} at{" "}
                            {o.changeStops.join(", ")}
                          </span>
                        )}
                        <span>·</span>
                        {o.next.status === "not_started" ? (
                          <span>not started yet</span>
                        ) : (
                          <LateBadge lateMin={o.next.lateMin} />
                        )}
                      </div>
                      <p className="mt-2 text-sm">
                        Be at {o.next.legs[0]!.boardStopName} by{" "}
                        <span className="font-medium tabular-nums">
                          {fmtClock(o.next.beAtStopBy)}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {" "}
                          · bus due ~{fmtClock(o.next.legs[0]!.boardEst)}
                        </span>
                      </p>
                    </>
                  )}
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <PlanFallback query={query} from={from} to={to} />
      )}
    </>
  );
}
