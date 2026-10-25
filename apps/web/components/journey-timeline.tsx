/** @format */

import type { JourneyView } from "@app/core/types";
import { Bus } from "lucide-react";
import { Clock } from "@/components/clock";
import { RouteChip } from "@/components/route-chip";
import { fmtAgo, fmtDuration } from "@/lib/time";
import { timelineRows } from "@/lib/timeline";
import { cn } from "@/lib/utils";

interface JourneyTimelineProps {
  journey: JourneyView;
  now: number;
}

/** The bus's way to you and on to your destination, across every change: a time at every stop. */
export function JourneyTimeline({ journey, now }: JourneyTimelineProps) {
  const rows = timelineRows(journey);

  return (
    <ol className="grid grid-cols-[54px_36px_minmax(0,1fr)]">
      {rows.map((r, i) => {
        const isLast = i === rows.length - 1;

        if (r.kind === "wait")
          return (
            <li key={`wait-${r.stopId}`} className="contents">
              <Clock
                ms={r.departs}
                bare
                className="pt-2.5 text-[15px] font-bold"
              />
              <div aria-hidden className="flex flex-col items-center">
                <span className="w-1 flex-1 border-l-4 border-dotted border-route" />
              </div>
              <div className="flex flex-wrap items-center gap-2 py-2 pb-[22px] pl-1 text-[15px] font-semibold">
                <span className="text-muted-foreground">
                  Wait {fmtDuration(r.waitMin * 60_000)}, then
                </span>
                <RouteChip name={r.routeName} className="h-7 text-sm" />
              </div>
            </li>
          );

        const strong =
          r.kind === "board" || r.kind === "change" || r.kind === "end";

        return (
          <li key={`${r.kind}-${r.stopId}`} className="contents">
            <Clock
              ms={r.at}
              bare
              className={cn(
                strong
                  ? "pt-px text-[21px] font-extrabold"
                  : "pt-1.5 text-[15px] text-muted-foreground",
              )}
            />
            <div aria-hidden className="flex flex-col items-center">
              {r.kind === "bus" ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-foreground">
                  <Bus className="size-4 text-background" strokeWidth={2.2} />
                </span>
              ) : r.kind === "board" || r.kind === "change" ? (
                <span className="size-[26px] rounded-full border-[6px] border-route bg-background" />
              ) : r.kind === "end" ? (
                <span className="size-[26px] rounded-full bg-route" />
              ) : (
                <span className="mt-1.5 size-3 rounded-full bg-route" />
              )}
              {!isLast && <span className="min-h-[34px] w-1 flex-1 bg-route" />}
            </div>
            <div
              className={cn(
                "flex flex-col gap-0.5 pl-1",
                !isLast && "pb-[22px]",
                r.kind === "bus" && "pt-1",
              )}
            >
              <span
                className={cn(
                  strong
                    ? "text-lg font-extrabold"
                    : r.kind === "bus"
                      ? "text-base font-semibold"
                      : "pt-1 text-base text-muted-foreground",
                )}
              >
                {r.name}
              </span>
              {r.kind === "bus" && journey.lastSeen && (
                <span className="text-[13px] text-muted-foreground">
                  {fmtAgo(journey.lastSeen.at, now)}
                </span>
              )}
              {r.kind === "board" && (
                <span className="text-[13px] font-bold text-route">
                  Your stop
                </span>
              )}
              {r.kind === "change" && (
                <span className="text-[13px] font-bold text-route">
                  Change here
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
