/** @format */

import { Bus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteChipProps {
  /** full route name, e.g. "1 · ABES College to Mohan Nagar"; the chip shows its number */
  name: string;
  className?: string;
}

/** "Bus 1": a bus icon plus the route number, so the number never stands alone. */
export function RouteChip({ name, className }: RouteChipProps) {
  const number = name.split(" · ")[0];

  return (
    <span
      aria-label={`Bus ${number}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-route pr-3 pl-2.5 text-base font-extrabold text-route-foreground",
        className,
      )}
    >
      <Bus aria-hidden className="size-4" strokeWidth={2.4} />
      {number}
    </span>
  );
}
