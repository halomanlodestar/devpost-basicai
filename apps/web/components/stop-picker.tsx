/** @format */

"use client";

import type { Stop } from "@app/core/types";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface StopPickerProps {
  label: string;
  placeholder: string;
  stops: Stop[];
  value: string;
  onChange: (id: string) => void;
  dot: "hollow" | "filled";
}

export function StopPicker({
  label,
  placeholder,
  stops,
  value,
  onChange,
  dot,
}: StopPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = stops.find((s) => s.id === value);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-4 px-4 py-4 text-left"
      >
        <span
          aria-hidden
          className={
            dot === "filled"
              ? "size-3 shrink-0 rounded-full bg-primary"
              : "size-3 shrink-0 rounded-full border-2 border-primary bg-background"
          }
        />
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span
            className={
              selected
                ? "block truncate text-base font-medium"
                : "block truncate text-base text-muted-foreground"
            }
          >
            {selected?.name ?? placeholder}
          </span>
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto h-[80dvh] max-w-[480px] rounded-t-2xl p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle>{label}</SheetTitle>
          </SheetHeader>
          <Command className="flex-1 bg-transparent">
            <CommandInput placeholder="Type a stop name" autoFocus />
            <CommandList className="max-h-none">
              <CommandEmpty>No stop with that name.</CommandEmpty>
              {stops.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className="py-3 text-base"
                >
                  {s.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </SheetContent>
      </Sheet>
    </>
  );
}
