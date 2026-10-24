/** @format */

import { clockParts } from "@/lib/time";
import { cn } from "@/lib/utils";

interface ClockProps {
  ms: number;
  className?: string;
  /** hide "am/pm" where the hour is unambiguous in context */
  bare?: boolean;
}

/** A big time with a small am/pm: "5:30 pm". */
export function Clock({ ms, className, bare }: ClockProps) {
  const { hm, ampm } = clockParts(ms);

  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {hm}
      {!bare && <span className="ml-1 text-[0.4em] font-semibold">{ampm}</span>}
    </span>
  );
}
