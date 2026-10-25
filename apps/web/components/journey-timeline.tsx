/** @format */

import type { JourneyView } from "@app/core/types";
import { Bus } from "lucide-react";
import { Clock } from "@/components/clock";
import { RouteChip } from "@/components/route-chip";
import { interchange, routeColor } from "@/lib/route-color";
import { fmtAgo, fmtDuration } from "@/lib/time";
import { timelineRows } from "@/lib/timeline";
import { cn } from "@/lib/utils";

interface JourneyTimelineProps {
  journey: JourneyView;
  now: number;
}

/**
 * The whole trip in each route's color: the bus's way to you (faded), your stop,
 * stops you pass through (lighter), the change and the next bus, your destination.
 */
export function JourneyTimeline({ journey, now }: JourneyTimelineProps) {
  const rows = timelineRows(journey);

  return (
    <ol className="grid grid-cols-[54px_36px_minmax(0,1fr)]">
      {rows.map((r, i) => {
        const isLast = i === rows.length - 1;
        const color = routeColor(r.routeName).bg;
        // the line below this row belongs to whatever is ridden next
        const below =
          r.kind === "change" ? routeColor(r.nextRouteName!).bg : color;
        const fadedBelow = rows[i + 1]?.beforeBoard ?? false;

        if (r.kind === "depart")
          return (
            <li key={`depart-${r.stopId}`} className="contents">
              <Clock
                ms={r.at}
                bare
                className="pt-1 text-[19px] font-extrabold"
              />
              <div aria-hidden className="flex flex-col items-center">
                <RouteChip
                  name={r.routeName}
                  compact
                  className="h-[26px] text-[13px]"
                />
                <span
                  className="min-h-[26px] w-1 flex-1"
                  style={{ background: color }}
                />
              </div>
              <div className="pt-1 pb-[18px] pl-1 text-sm font-semibold text-muted-foreground">
                Bus {r.routeName.split(" · ")[0]} leaves
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
              ) : r.kind === "change" ? (
                <span
                  className="flex size-[26px] items-center justify-center rounded-full"
                  style={{
                    background: interchange(r.routeName, r.nextRouteName!),
                  }}
                >
                  <span className="size-3 rounded-full bg-background" />
                </span>
              ) : r.kind === "board" ? (
                <span
                  className="size-[26px] rounded-full border-[6px] bg-background"
                  style={{ borderColor: color }}
                />
              ) : r.kind === "end" ? (
                <span
                  className="size-[26px] rounded-full"
                  style={{ background: color }}
                />
              ) : (
                <span
                  className={cn(
                    "mt-1.5 size-3 rounded-full",
                    r.beforeBoard ? "opacity-30" : "opacity-45",
                  )}
                  style={{ background: color }}
                />
              )}
              {!isLast &&
                (r.kind === "change" ? (
                  <span
                    className="min-h-[34px] w-0 flex-1 border-l-4 border-dotted"
                    style={{ borderColor: below }}
                  />
                ) : (
                  <span
                    className={cn(
                      "min-h-[34px] w-1 flex-1",
                      fadedBelow && "opacity-30",
                    )}
                    style={{ background: below }}
                  />
                ))}
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
                      : cn(
                          "pt-1 text-base text-muted-foreground",
                          r.beforeBoard && "opacity-70",
                        ),
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
                <span className="text-[13px] font-bold" style={{ color }}>
                  Your stop
                </span>
              )}
              {r.kind === "change" && (
                <span className="text-[13px] font-bold text-muted-foreground">
                  Change here · wait {fmtDuration((r.waitMin ?? 0) * 60_000)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
