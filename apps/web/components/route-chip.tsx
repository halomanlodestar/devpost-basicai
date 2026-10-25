/** @format */

import { Bus } from "lucide-react";
import Link from "next/link";
import { routeColor, routeNumber } from "@/lib/route-color";
import { cn } from "@/lib/utils";

interface RouteChipProps {
  /** full route name, e.g. "1 · ABES College to Mohan Nagar"; the chip shows its number */
  name: string;
  /** makes the chip a link (to the route's line view) */
  href?: string;
  /** number only, no bus icon: for tight spots like the timeline */
  compact?: boolean;
  className?: string;
}

/** "Bus 1" in the route's own color: a bus icon plus the number, so it never stands alone. */
export function RouteChip({ name, href, compact, className }: RouteChipProps) {
  const number = routeNumber(name);
  const { bg, ink } = routeColor(name);
  const classes = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full text-base font-extrabold",
    compact ? "px-2.5" : "pr-3 pl-2.5",
    className,
  );
  const body = (
    <>
      {!compact && <Bus aria-hidden className="size-4" strokeWidth={2.4} />}
      {number}
    </>
  );

  return href ? (
    <Link
      href={href}
      aria-label={`Bus ${number}: see the whole line`}
      className={classes}
      style={{ background: bg, color: ink }}
    >
      {body}
    </Link>
  ) : (
    <span
      aria-label={`Bus ${number}`}
      className={classes}
      style={{ background: bg, color: ink }}
    >
      {body}
    </span>
  );
}
