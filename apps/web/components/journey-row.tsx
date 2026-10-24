/** @format */

import type { JourneyView } from "@app/core/types";
import { LateBadge } from "@/components/late-badge";
import { fmtAgo, fmtClock } from "@/lib/time";

interface JourneyRowProps {
  j: JourneyView;
  now: number;
}

export function JourneyRow({ j, now }: JourneyRowProps) {
  return (
    <li className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Be at your stop by</p>
          <p className="text-3xl font-semibold tabular-nums">
            {fmtClock(j.beAtStopBy)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">There by</p>
          <p className="text-xl font-medium tabular-nums">
            {fmtClock(j.arriveBy)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        {j.status === "not_started" ? (
          <span>not started · expected {fmtClock(j.expectedX)}</span>
        ) : (
          <>
            <LateBadge lateMin={j.lateMin} />
            {j.lastSeen && (
              <span>
                · last seen at {j.lastSeen.stopName} ·{" "}
                {fmtAgo(j.lastSeen.at, now)}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
