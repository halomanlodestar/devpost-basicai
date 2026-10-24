/** @format */

import type { JourneyView } from "@app/core/types";
import { LateBadge } from "@/components/late-badge";
import { fmtAgo, fmtClock } from "@/lib/time";

interface JourneyRowProps {
  j: JourneyView;
  now: number;
}

export function JourneyRow({ j, now }: JourneyRowProps) {
  const first = j.legs[0]!;
  const last = j.legs[j.legs.length - 1]!;

  if (j.overdue)
    return (
      <li className="rounded-2xl border border-dashed bg-card/60 p-4">
        <p className="text-xs text-muted-foreground">
          Was due at {first.boardStopName}
        </p>
        <p className="text-2xl font-semibold text-muted-foreground tabular-nums">
          {fmtClock(j.expectedX)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No report from this bus yet. If it&apos;s running, it reaches your
          stop after {fmtClock(first.boardEst)}.
        </p>
      </li>
    );

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            Be at {first.boardStopName} by
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {fmtClock(j.beAtStopBy)}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            bus due ~{fmtClock(first.boardEst)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs text-muted-foreground">
            Reaches {last.alightStopName} by
          </p>
          <p className="text-xl font-medium tabular-nums">
            {fmtClock(j.arriveBy)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        {j.status === "not_started" ? (
          <span>not started yet</span>
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
