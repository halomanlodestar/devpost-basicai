/** @format */

import type { Option } from "@app/core/types";
import { Bus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { Clock } from "@/components/clock";
import { LateLabel } from "@/components/late-label";
import { RouteChip } from "@/components/route-chip";
import { fmtAgo, fmtDuration } from "@/lib/time";

interface OptionCardProps {
  option: Option;
  href: string;
  now: number;
}

/** One way to get from X to Y as a small vertical route: your stop, each ride (and change), your destination. */
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
        {option.routes.map((r, i) => (
          <Fragment key={r}>
            {i > 0 && (
              <ChevronRight
                aria-hidden
                className="size-4 text-muted-foreground"
              />
            )}
            <RouteChip name={r} />
          </Fragment>
        ))}
        <span className="flex-1" />
        {j.status === "active" && (
          <LateLabel lateMin={j.lateMin} className="text-[15px]" />
        )}
      </div>

      <div className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3">
        <span
          aria-hidden
          className="size-3.5 justify-self-center rounded-full border-[3px] border-route"
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
                  className="size-3 justify-self-center rounded-full border-[3px] border-route bg-card"
                />
                <span className="text-[15px] font-bold">
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
              className="h-11 w-1 justify-self-center rounded-full bg-route"
            />
            <span className="text-[13px] font-semibold text-muted-foreground">
              {fmtDuration(leg.alightEst - leg.boardEst)}{" "}
              {multi ? `on bus ${leg.routeName.split(" · ")[0]}` : "ride"}
            </span>
            <span />
          </Fragment>
        ))}

        <span
          aria-hidden
          className="size-3.5 justify-self-center rounded-full bg-route"
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
