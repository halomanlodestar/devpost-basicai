/** @format */

"use client";

import type { Stop } from "@app/core/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { ChevronLeft, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useDebounced } from "@/hooks/use-debounced";
import { useTRPC } from "@/lib/trpc";

interface StopPickerProps {
  /** "From" / "To": the field's placeholder and the search screen's name */
  label: string;
  value: Stop | null;
  onChange: (stop: Stop) => void;
}

/** A field that opens a full-screen search; matches come from the server as the rider types. */
export function StopPicker({ label, value, onChange }: StopPickerProps) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const results = useQuery({
    ...trpc.stops.search.queryOptions({ q: query }),
    enabled: open && query.length > 0,
    placeholderData: keepPreviousData,
  });
  const stops = query ? (results.data ?? []) : [];

  const close = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <>
      <button
        type="button"
        aria-label={value ? `${label}: ${value.name}` : label}
        onClick={() => setOpen(true)}
        className="flex h-16 w-full items-center pr-16 text-left"
      >
        <span
          className={
            value
              ? "truncate text-[22px] font-bold"
              : "truncate text-[22px] font-bold text-muted-foreground/70"
          }
        >
          {value?.name ?? label}
        </span>
      </button>

      <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[480px] gap-0 border-0 p-0 data-[side=bottom]:h-dvh"
        >
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <CommandPrimitive
            shouldFilter={false}
            className="flex h-full flex-col"
          >
            <div className="flex items-center gap-1 px-3 pt-4 pb-3">
              <button
                type="button"
                aria-label="Back"
                onClick={close}
                className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"
              >
                <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
              </button>
              <div className="flex h-12 flex-1 items-center gap-2 rounded-lg bg-card px-3.5">
                <Search
                  aria-hidden
                  className="size-[18px] shrink-0 text-muted-foreground"
                />
                <CommandPrimitive.Input
                  autoFocus
                  value={q}
                  onValueChange={setQ}
                  placeholder={label}
                  className="h-full w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            </div>
            <CommandPrimitive.List className="flex-1 overflow-y-auto px-3 pb-6">
              {query && !results.isFetching && stops.length === 0 && (
                <CommandPrimitive.Empty className="px-3 py-8 text-center text-muted-foreground">
                  {results.isError
                    ? "Can't reach live data right now."
                    : "No stop matches that."}
                </CommandPrimitive.Empty>
              )}
              {stops.map((s) => (
                <CommandPrimitive.Item
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onChange(s);
                    close();
                  }}
                  className="flex h-14 cursor-pointer items-center gap-3 rounded-lg px-3 text-[17px] font-semibold data-[selected=true]:bg-card"
                >
                  <MapPin
                    aria-hidden
                    className="size-[18px] shrink-0 text-route"
                  />
                  {s.name}
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </SheetContent>
      </Sheet>
    </>
  );
}
