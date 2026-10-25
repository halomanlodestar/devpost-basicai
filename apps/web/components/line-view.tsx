/** @format */

"use client";

import { Bus, ChevronLeft, Clock as ClockIcon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment } from "react";
import { Clock } from "@/components/clock";
import { LateLabel } from "@/components/late-label";
import { RouteChip } from "@/components/route-chip";
import { useLine } from "@/hooks/use-line";
import { useNow } from "@/hooks/use-now";
import { routeColor } from "@/lib/route-color";
import { fmtAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

/** A bus line end to end: every stop, every bus on it right now, your part of the line in bold. */
export function LineViewScreen() {
  const router = useRouter();
  const { routeId } = useParams<{ routeId: string }>();
  const params = useSearchParams();
  const journeyId = params.get("journey") ?? undefined;
  const line = useLine(decodeURIComponent(routeId), journeyId);
  const now = useNow();
  const v = line.data;

  const header = (
    <header className="-ml-3 flex items-center gap-2">
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.back()}
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"
      >
        <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
      </button>
      {v && (
        <>
          <RouteChip name={v.routeName} />
          <span className="min-w-0 truncate text-base font-bold">
            towards {v.stops.at(-1)!.name}
          </span>
        </>
      )}
    </header>
  );

  if (!v)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="py-10 text-center text-muted-foreground">
          {line.isPending
            ? "Loading the line…"
            : line.isError
              ? "Can't reach live data right now."
              : "No such bus line."}
        </p>
      </div>
    );

  const color = routeColor(v.routeName).bg;
  const seqOf = (id: string | null) =>
    v.stops.find((s) => s.stopId === id)?.seq;
  const board = seqOf(params.get("board"));
  const alight = seqOf(params.get("alight"));
  const ride = (seq: number) =>
    board === undefined ||
    alight === undefined ||
    (seq >= board && seq <= alight);
  const rideSegment = (seq: number) =>
    ride(seq) && ride(seq + 1) && seq !== alight;
  const last = v.stops.length - 1;

  return (
    <div className="flex flex-col gap-6">
      {header}
      <ol className="grid grid-cols-[54px_36px_minmax(0,1fr)]">
        {v.stops.map((s) => {
          const isBoard = s.seq === board;
          const isAlight = s.seq === alight;
          const inRide = ride(s.seq);
          const buses = v.buses.filter((b) => b.afterSeq === s.seq);
          const segment = (
            <span
              className={cn(
                "min-h-[44px] flex-1",
                rideSegment(s.seq) ? "w-1.5" : "w-1 opacity-30",
              )}
              style={{ background: color }}
            />
          );

          return (
            <Fragment key={s.stopId}>
              <li className="contents">
                {s.est ? (
                  <Clock
                    ms={s.est}
                    bare
                    className={cn(
                      isBoard || isAlight
                        ? "pt-px text-xl font-extrabold"
                        : "pt-1 text-[15px] text-muted-foreground",
                      !inRide && "opacity-60",
                    )}
                  />
                ) : (
                  <span />
                )}
                <div aria-hidden className="flex flex-col items-center">
                  {isBoard ? (
                    <span
                      className="size-6 rounded-full border-[6px] bg-background"
                      style={{ borderColor: color }}
                    />
                  ) : isAlight ? (
                    <span
                      className="size-6 rounded-full"
                      style={{ background: color }}
                    />
                  ) : (
                    <span
                      className={cn(
                        "mt-1 size-3 rounded-full",
                        inRide ? "opacity-45" : "opacity-30",
                      )}
                      style={{ background: color }}
                    />
                  )}
                  {s.seq < last && buses.length === 0 && segment}
                  {s.seq < last && buses.length > 0 && (
                    <span
                      className={cn(
                        "h-4",
                        rideSegment(s.seq) ? "w-1.5" : "w-1 opacity-30",
                      )}
                      style={{ background: color }}
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "flex flex-col gap-0.5 pl-1",
                    s.seq < last && buses.length === 0 && "pb-6",
                  )}
                >
                  <span
                    className={cn(
                      isBoard || isAlight
                        ? "text-[17px] font-extrabold"
                        : "pt-0.5 text-base",
                      !inRide && "text-muted-foreground opacity-70",
                    )}
                  >
                    {s.name}
                  </span>
                  {isBoard && (
                    <span className="text-xs font-bold" style={{ color }}>
                      You get on
                    </span>
                  )}
                  {isAlight && (
                    <span className="text-xs font-bold" style={{ color }}>
                      You get off
                    </span>
                  )}
                </div>
              </li>

              {buses.map((b) => (
                <li key={b.journeyId} className="contents">
                  <span />
                  <div aria-hidden className="flex flex-col items-center">
                    <span className="flex size-8 items-center justify-center rounded-full bg-foreground ring-4 ring-background">
                      <Bus
                        className="size-4 text-background"
                        strokeWidth={2.2}
                      />
                    </span>
                    {s.seq < last && segment}
                  </div>
                  <div className="flex flex-col pt-0.5 pb-6 pl-1">
                    <LateLabel lateMin={b.lateMin} className="text-[13px]" />
                    <span className="text-xs text-muted-foreground">
                      left {b.lastSeen.stopName} · {fmtAgo(b.lastSeen.at, now)}
                    </span>
                  </div>
                </li>
              ))}
            </Fragment>
          );
        })}
      </ol>
      {v.journeyId && (
        <p className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-border px-4 py-3.5 text-sm text-muted-foreground">
          <ClockIcon aria-hidden className="size-4 shrink-0" />
          Times are for your bus
        </p>
      )}
    </div>
  );
}
