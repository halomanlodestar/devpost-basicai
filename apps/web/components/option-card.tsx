/** @format */

import type { Option } from "@app/core/types";
import { Bus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { Clock } from "@/components/clock";
import { LateLabel } from "@/components/late-label";
import { RouteChip } from "@/components/route-chip";
import { interchange, routeColor, routeNumber } from "@/lib/route-color";
import { fmtAgo, fmtDuration } from "@/lib/time";

interface OptionCardProps {
  option: Option;
  href: string;
  now: number;
}

interface ChipsProps {
  routes: string[];
}

function Chips({ routes }: ChipsProps) {
  return routes.map((r, i) => (
    <Fragment key={r}>
      {i > 0 && (
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      )}
      <RouteChip name={r} />
    </Fragment>
  ));
}

/** The fastest way from X to Y as a small vertical route, each ride in its bus's color. */
export function OptionCard({ option, href, now }: OptionCardProps) {
  const j = option.next;
  const first = j.legs[0]!;
  const last = j.legs[j.legs.length - 1]!;
  const multi = j.legs.length > 1;

  return (
    <Link
      href={href}
      className="flex flex-col gap-[18px] rounded-xl bg-card p-5 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-1.5">
        <Chips routes={option.routes} />
        <span className="flex-1" />
        {j.status === "active" && (
          <LateLabel lateMin={j.lateMin} className="text-[15px]" />
        )}
      </div>

      <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3">
        <span
          aria-hidden
          className="size-3.5 justify-self-center rounded-full border-[3px]"
          style={{ borderColor: routeColor(first.routeName).bg }}
        />
        <span className="text-[17px] font-bold">{first.boardStopName}</span>
        <Clock
          ms={j.beAtStopBy}
          className="text-[36px] leading-none font-extrabold"
        />

        {j.legs.map((leg, i) => (
          <Fragment key={leg.journeyId}>
            {i > 0 && (
              <>
                <span
                  aria-hidden
                  className="flex size-5 items-center justify-center justify-self-center rounded-full"
                  style={{
                    background: interchange(
                      j.legs[i - 1]!.routeName,
                      leg.routeName,
                    ),
                  }}
                >
                  <span className="size-2 rounded-full bg-card" />
                </span>
                <span className="text-base font-bold">
                  {leg.boardStopName}
                  <span className="ml-2 text-[13px] font-semibold text-muted-foreground">
                    wait {fmtDuration((leg.waitMinBefore ?? 0) * 60_000)}
                  </span>
                </span>
                <Clock ms={leg.boardEst} className="text-lg font-bold" />
              </>
            )}
            <span
              aria-hidden
              className="h-10 w-[5px] justify-self-center rounded-full"
              style={{ background: routeColor(leg.routeName).bg }}
            />
            <span className="text-[13px] font-semibold text-muted-foreground">
              {fmtDuration(leg.alightEst - leg.boardEst)}{" "}
              {multi ? `on bus ${routeNumber(leg.routeName)}` : "ride"}
            </span>
            <span />
          </Fragment>
        ))}

        <span
          aria-hidden
          className="size-3.5 justify-self-center rounded-full"
          style={{ background: routeColor(last.routeName).bg }}
        />
        <span className="text-[17px] font-bold">{last.alightStopName}</span>
        <Clock ms={j.arriveBy} className="text-[28px] leading-none font-bold" />
      </div>

      <div className="flex items-center gap-2 border-t-[1.5px] border-border pt-3.5 text-sm text-muted-foreground">
        <Bus className="size-4" />
        {j.lastSeen
          ? `Last seen at ${j.lastSeen.stopName} · ${fmtAgo(j.lastSeen.at, now)}`
          : "Not started yet"}
      </div>
    </Link>
  );
}

/** A slower alternative, kept small: its buses, a bar split by ride time, be-there and arrival. */
export function OptionCompact({ option, href }: Omit<OptionCardProps, "now">) {
  const j = option.next;
  const total = j.legs.reduce((s, l) => s + (l.alightEst - l.boardEst), 0) || 1;

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl bg-card px-5 py-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-1.5">
        <Chips routes={option.routes} />
        <span className="flex-1" />
        {option.changeStops.length > 0 && (
          <span className="truncate text-[13px] text-muted-foreground">
            via {option.changeStops.join(", ")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3.5">
        <div
          aria-hidden
          className="flex h-1.5 gap-0.5 overflow-hidden rounded-full"
        >
          {j.legs.map((l) => (
            <span
              key={l.journeyId}
              className="h-full"
              style={{
                flex: (l.alightEst - l.boardEst) / total,
                background: routeColor(l.routeName).bg,
              }}
            />
          ))}
        </div>
        <Clock ms={j.beAtStopBy} className="text-xl font-extrabold" />
        <Clock
          ms={j.arriveBy}
          className="text-xl font-bold text-muted-foreground"
        />
      </div>
    </Link>
  );
}
