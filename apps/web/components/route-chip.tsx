/** @format */

import { cn } from "@/lib/utils";

interface RouteChipProps {
  /** full route name, e.g. "1 · ABES College → Mohan Nagar" */
  name: string;
  className?: string;
}

export function RouteChip({ name, className }: RouteChipProps) {
  return (
    <span
      aria-label={`Bus ${name.split(" · ")[0]}`}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-route text-base font-extrabold text-route-foreground",
        className,
      )}
    >
      {name.split(" · ")[0]}
    </span>
  );
}
