/** @format */

import { isOnTime } from "@app/core/predict";
import { cn } from "@/lib/utils";

interface LateLabelProps {
  lateMin: number;
  className?: string;
}

/** "Late by 4 min" in red, "Early by 3 min" / "On time" in green. Words carry it; color backs it up. */
export function LateLabel({ lateMin, className }: LateLabelProps) {
  const [text, tone] = isOnTime(lateMin)
    ? ["On time", "text-early"]
    : lateMin > 0
      ? [`Late by ${lateMin} min`, "text-late"]
      : [`Early by ${-lateMin} min`, "text-early"];

  return <span className={cn("font-bold", tone, className)}>{text}</span>;
}
