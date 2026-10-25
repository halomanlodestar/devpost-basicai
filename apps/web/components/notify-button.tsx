/** @format */

"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { useNotify } from "@/hooks/use-notify";
import type { NotifyTarget } from "@/types/alerts";

interface NotifyButtonProps {
  target: NotifyTarget;
}

/** Notify me: pushes 45/30/15 min before "be there by", and when the bus slips. */
export function NotifyButton({ target }: NotifyButtonProps) {
  const n = useNotify(target);

  if (n.support === "unconfigured")
    return (
      <p className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-border px-4 py-3.5 text-sm text-muted-foreground">
        <BellOff aria-hidden className="size-4 shrink-0" />
        Alerts aren&apos;t available right now
      </p>
    );

  if (n.support === "unsupported")
    return (
      <p className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-border px-4 py-3.5 text-sm text-muted-foreground">
        <BellOff aria-hidden className="size-4 shrink-0" />
        Install the app to get alerts on this phone
      </p>
    );

  if (n.support === "denied")
    return (
      <p className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-border px-4 py-3.5 text-sm text-muted-foreground">
        <BellOff aria-hidden className="size-4 shrink-0" />
        Notifications are blocked for this site. Allow them in your browser
        settings.
      </p>
    );

  return (
    <div className="flex flex-col gap-2">
      {n.on ? (
        <button
          type="button"
          disabled={n.busy}
          onClick={() => void n.turnOff()}
          className="flex h-14 items-center justify-center gap-2 rounded-lg border-[1.5px] border-border text-base font-bold transition-colors hover:bg-accent disabled:opacity-50"
        >
          <BellRing
            aria-hidden
            className="size-[18px] text-route"
            strokeWidth={2.4}
          />
          Alerts on · turn off
        </button>
      ) : (
        <button
          type="button"
          disabled={n.busy}
          onClick={() => void n.turnOn()}
          className="flex h-14 items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Bell aria-hidden className="size-[18px]" strokeWidth={2.4} />
          Notify me
        </button>
      )}
      {n.failed && (
        <p className="text-center text-sm text-muted-foreground">
          Couldn&apos;t set that up. Try again in a moment.
        </p>
      )}
    </div>
  );
}
