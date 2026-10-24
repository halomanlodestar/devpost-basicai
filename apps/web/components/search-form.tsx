/** @format */

"use client";

import type { Stop } from "@app/core/types";
import { ArrowDownUp, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StopPicker } from "@/components/stop-picker";

export function SearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const canSearch = Boolean(from && to && from.id !== to.id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSearch)
          router.push(
            `/plan?${new URLSearchParams({ from: from!.id, to: to!.id })}`,
          );
      }}
      className="flex flex-col gap-3.5"
    >
      <div className="relative grid grid-cols-[48px_minmax(0,1fr)] rounded-xl bg-card">
        {/* the rail: hollow dot = from, filled dot = to */}
        <div
          aria-hidden
          className="row-span-2 flex flex-col items-center py-[26px]"
        >
          <span className="size-3.5 rounded-full border-[3px] border-route" />
          <span className="my-[3px] w-1 flex-1 rounded-full bg-route" />
          <span className="size-3.5 rounded-full bg-route" />
        </div>
        <div className="border-b-[1.5px] border-border">
          <StopPicker label="From" value={from} onChange={setFrom} />
        </div>
        <StopPicker label="To" value={to} onChange={setTo} />
        <button
          type="button"
          aria-label="Swap From and To"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background transition-colors hover:bg-accent"
        >
          <ArrowDownUp className="size-[18px]" />
        </button>
      </div>
      {from && to && from.id === to.id && (
        <p className="px-1 text-sm text-muted-foreground">
          Pick two different stops.
        </p>
      )}
      <button
        type="submit"
        disabled={!canSearch}
        className="flex h-[60px] items-center justify-center gap-1.5 rounded-lg bg-primary text-lg font-bold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        Find buses
        <ChevronRight className="size-5" strokeWidth={2.6} />
      </button>
    </form>
  );
}
