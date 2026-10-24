/** @format */

"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTRPC } from "@/lib/trpc";

interface PlanHeaderProps {
  back: string;
  /** shows the From and To stop names, joined by an arrow icon, when given */
  from?: string;
  to?: string;
  /** anything else to sit beside the back button (e.g. a route chip) */
  children?: ReactNode;
  reconnecting?: boolean;
}

export function PlanHeader({
  back,
  from,
  to,
  children,
  reconnecting,
}: PlanHeaderProps) {
  const trpc = useTRPC();
  const stops = useQuery({
    ...trpc.stops.list.queryOptions(),
    enabled: Boolean(from && to),
  });
  const name = (id: string) =>
    stops.data?.find((s) => s.id === id)?.name ?? "…";

  return (
    <header className="-ml-3 flex items-center gap-1.5">
      <Link
        href={back}
        aria-label="Back"
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"
      >
        <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
      </Link>
      {from && to && (
        <h1 className="flex min-w-0 flex-1 items-center gap-2 text-[22px] font-extrabold tracking-tight">
          <span className="truncate">{name(from)}</span>
          <ArrowRight
            aria-label="to"
            className="size-5 shrink-0 text-route"
            strokeWidth={2.6}
          />
          <span className="truncate">{name(to)}</span>
        </h1>
      )}
      {children}
      {reconnecting && (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          reconnecting…
        </span>
      )}
    </header>
  );
}
