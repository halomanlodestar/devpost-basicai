/** @format */

import { SERVICE_TZ } from "@app/core/time";

const clock = new Intl.DateTimeFormat("en-IN", {
  timeZone: SERVICE_TZ,
  hour: "numeric",
  minute: "2-digit",
});

/** "4:40 pm" in service time. */
export const fmtClock = (ms: number) =>
  clock.format(ms).replace(/\s/g, " ").toLowerCase();

/** { hm: "4:40", ampm: "pm" } for big times with a small suffix. */
export function clockParts(ms: number) {
  const [hm = "", ampm = ""] = fmtClock(ms).split(" ");

  return { hm, ampm };
}

/** "55 min" / "1 h 5 min" */
export function fmtDuration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));

  return m < 60
    ? `${m} min`
    : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
}

/** "just now" / "3 min ago" */
export function fmtAgo(ms: number, now: number) {
  const m = Math.floor((now - ms) / 60_000);

  return m < 1 ? "just now" : `${fmtDuration(m * 60_000)} ago`;
}
