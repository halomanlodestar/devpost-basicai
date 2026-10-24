/** @format */

import { isOnTime } from "@app/core/predict";
import { cn } from "@/lib/utils";

interface LateBadgeProps {
  lateMin: number;
  className?: string;
}

/** Colour carries meaning only: on time / early green, late amber, 20+ red. */
export function LateBadge({ lateMin, className }: LateBadgeProps) {
  const [text, tone] = isOnTime(lateMin)
    ? ["on time", "text-ontime"]
    : lateMin < 0
      ? [`${-lateMin} min early`, "text-ontime"]
      : [`${lateMin} min late`, lateMin >= 20 ? "text-very-late" : "text-late"];
  return (
    <span className={cn("text-sm font-medium", tone, className)}>{text}</span>
  );
}
