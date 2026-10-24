/** @format */

import type { JourneyView } from "@app/core/types";
import { Bus } from "lucide-react";
import { Clock } from "@/components/clock";
import { fmtAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

interface JourneyTimelineProps {
  journey: JourneyView;
  now: number;
}

/** The bus's way to you and on to your destination: a time at every stop. */
export function JourneyTimeline({ journey, now }: JourneyTimelineProps) {
  const leg = journey.legs[0]!;
  const last = leg.stops.length - 1;

  return (
    <ol className="grid grid-cols-[54px_36px_minmax(0,1fr)]">
      {leg.stops.map((s, i) => {
        const isBus = i === 0 && s.stopId !== leg.boardStopId; // the bus is behind you: its last-seen stop
        const isBoard = s.stopId === leg.boardStopId;
        const isEnd = i === last;
        const key = isBus || isBoard || isEnd;

        return (
          <li key={s.stopId} className="contents">
            <Clock
              ms={isEnd ? journey.arriveBy : s.est}
              bare
              className={cn(
                key && !isBus
                  ? "pt-px text-[21px] font-extrabold"
                  : "pt-1.5 text-[15px] text-muted-foreground",
              )}
            />
            <div aria-hidden className="flex flex-col items-center">
              {isBus ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-foreground">
                  <Bus className="size-4 text-background" strokeWidth={2.2} />
                </span>
              ) : isBoard ? (
                <span className="size-[26px] rounded-full border-[6px] border-route bg-background" />
              ) : isEnd ? (
                <span className="size-[26px] rounded-full bg-route" />
              ) : (
                <span className="mt-1.5 size-3 rounded-full bg-route" />
              )}
              {!isEnd && <span className="min-h-[34px] w-1 flex-1 bg-route" />}
            </div>
            <div
              className={cn(
                "flex flex-col gap-0.5 pl-1",
                isEnd ? "" : "pb-[22px]",
                isBus && "pt-1",
              )}
            >
              <span
                className={cn(
                  isBoard || isEnd
                    ? "text-lg font-extrabold"
                    : isBus
                      ? "text-base font-semibold"
                      : "pt-1 text-base text-muted-foreground",
                )}
              >
                {s.name}
              </span>
              {isBus && journey.lastSeen && (
                <span className="text-[13px] text-muted-foreground">
                  {fmtAgo(journey.lastSeen.at, now)}
                </span>
              )}
              {isBoard && (
                <span className="text-[13px] font-bold text-route">
                  Your stop
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
