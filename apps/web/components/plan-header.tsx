/** @format */

"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc";

interface PlanHeaderProps {
  from: string;
  to: string;
  back: string;
  reconnecting?: boolean;
}

export function PlanHeader({ from, to, back, reconnecting }: PlanHeaderProps) {
  const trpc = useTRPC();
  const stops = useQuery(trpc.stops.list.queryOptions());
  const name = (id: string) =>
    stops.data?.find((s) => s.id === id)?.name ?? "…";
  return (
    <header className="mb-5 flex items-center gap-2">
      <Link
        href={back}
        aria-label="Back"
        className="-ml-2 rounded-full p-2 hover:bg-muted"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="min-w-0 truncate text-lg font-semibold">
        {name(from)} <span className="text-muted-foreground">→</span> {name(to)}
      </h1>
      {reconnecting && (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          reconnecting…
        </span>
      )}
    </header>
  );
}
