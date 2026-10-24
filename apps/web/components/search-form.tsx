/** @format */

"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StopPicker } from "@/components/stop-picker";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc";

export function SearchForm() {
  const trpc = useTRPC();
  const router = useRouter();
  const stops = useQuery(trpc.stops.list.queryOptions());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const canSearch = Boolean(from && to && from !== to);

  if (stops.isError)
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="font-medium">Can&apos;t reach live data right now.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => stops.refetch()}
        >
          Try again
        </Button>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSearch)
          router.push(`/plan?${new URLSearchParams({ from, to })}`);
      }}
      className="space-y-4"
    >
      <div className="relative rounded-2xl border bg-card shadow-sm">
        <span
          aria-hidden
          className="absolute top-[2.6rem] bottom-[2.6rem] left-[1.33rem] w-px bg-border"
        />
        <StopPicker
          label="From"
          placeholder="Leaving from"
          dot="hollow"
          stops={stops.data ?? []}
          value={from}
          onChange={setFrom}
        />
        <div className="ml-12 border-t" />
        <StopPicker
          label="To"
          placeholder="Going to"
          dot="filled"
          stops={stops.data ?? []}
          value={to}
          onChange={setTo}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Swap From and To"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-card"
        >
          <ArrowDownUp />
        </Button>
      </div>
      {from && from === to && (
        <p className="px-1 text-sm text-muted-foreground">
          Pick two different stops.
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={!canSearch}
        className="h-12 w-full rounded-xl text-base"
      >
        Search
      </Button>
    </form>
  );
}
