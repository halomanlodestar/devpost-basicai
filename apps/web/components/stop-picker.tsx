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
}

export function StopPicker({
  label,
  placeholder,
  stops,
  value,
  onChange,
}: StopPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = stops.find((s) => s.id === value);
  return (
    <>
      <button
        type="button"
        aria-label={selected ? `${label}: ${selected.name}` : label}
        onClick={() => setOpen(true)}
        className="flex h-16 w-full items-center pr-16 text-left"
      >
        <span
          className={
            selected
              ? "truncate text-[22px] font-bold"
              : "truncate text-[22px] font-bold text-muted-foreground/70"
          }
        >
          {selected?.name ?? placeholder}
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto h-[80dvh] max-w-[480px] rounded-t-xl p-0"
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
