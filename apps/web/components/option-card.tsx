/** @format */

import type { Option } from "@app/core/types";
import { Bus } from "lucide-react";
import Link from "next/link";
import { Clock } from "@/components/clock";
import { LateLabel } from "@/components/late-label";
import { RouteChip } from "@/components/route-chip";
import { fmtAgo, fmtDuration } from "@/lib/time";

interface OptionCardProps {
  option: Option;
  href: string;
  now: number;
}

/** One way to get from X to Y, as a small vertical route: your stop, the ride, your destination. */
export function OptionCard({ option, href, now }: OptionCardProps) {
  const j = option.next;
  const first = j.legs[0]!;
  const last = j.legs[j.legs.length - 1]!;

  return (
    <Link
      href={href}
      className="flex flex-col gap-[18px] rounded-xl bg-card p-5 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        {option.routes.map((r) => (
          <RouteChip key={r} name={r} />
        ))}
        {option.changes > 0 && (
          <span className="text-sm text-muted-foreground">
            {option.changes} change{option.changes > 1 ? "s" : ""} at{" "}
            {option.changeStops.join(", ")}
          </span>
        )}
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
        <div className="flex flex-col">
          <span className="text-[17px] font-bold">{first.boardStopName}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            Be there by
          </span>
        </div>
        <Clock
          ms={j.beAtStopBy}
          className="text-[36px] leading-none font-extrabold"
        />

        <span
          aria-hidden
          className="h-11 w-1 justify-self-center rounded-full bg-route"
        />
        <span className="text-[13px] font-semibold text-muted-foreground">
          {fmtDuration(last.alightEst - first.boardEst)} ride
        </span>
        <span />

        <span
          aria-hidden
          className="size-3.5 justify-self-center rounded-full bg-route"
        />
        <div className="flex flex-col">
          <span className="text-[17px] font-bold">{last.alightStopName}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            Arrive
          </span>
        </div>
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
