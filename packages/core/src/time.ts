/** @format */

// Service-day and time-of-day helpers. Everything else works in epoch ms.

import type { Bucket, DateParts } from "./types";

export const SERVICE_TZ = "Asia/Kolkata";
export const MIN = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function parts(at: number, tz: string): DateParts {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(at))
    if (type !== "literal") p[type] = Number(value);
  return p as unknown as DateParts;
}

function offsetMs(at: number, tz: string) {
  const p = parts(at, tz);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(at / 1000) * 1000
  );
}

/** Local calendar date (YYYY-MM-DD) of an instant in the service time zone. */
export function serviceDate(at: number, tz = SERVICE_TZ): string {
  const p = parts(at, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Epoch ms of local midnight that starts `date` in the service time zone. */
export function dayStart(date: string, tz = SERVICE_TZ): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const utcMidnight = Date.UTC(y, m - 1, d);
  const guess = utcMidnight - offsetMs(utcMidnight, tz);
  return utcMidnight - offsetMs(guess, tz);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function minuteOfDay(at: number, tz = SERVICE_TZ): number {
  const p = parts(at, tz);
  return p.hour * 60 + p.minute;
}

/** Time-of-day bucket for learned segment times (spec > Learning). */
export function bucketAt(at: number, tz = SERVICE_TZ): Bucket {
  const m = minuteOfDay(at, tz);
  if (m >= 7 * 60 && m < 10 * 60) return "am_peak";
  if (m >= 10 * 60 && m < 16 * 60) return "midday";
  if (m >= 16 * 60 && m < 20 * 60) return "pm_peak";
  return "off";
}
