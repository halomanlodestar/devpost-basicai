/** @format */

// Expected vs estimated arrival times (spec > Prediction).
// Expected = what this journey usually does; estimated = the live prediction.

import { segmentInto } from "./network";
import { bucketAt, dayStart, MIN } from "./time";
import type { Journey, PredictCtx, TripState, Typical } from "./types";

export const BUFFER_MS = 5 * MIN;

/** No history yet: every segment takes its timetable time. */
export const timetableOnly: Typical = (_segment, _bucket, priorSec) => priorSec;

function chain(
  ctx: PredictCtx,
  journey: Journey,
  from: number,
  at: number,
  out: number[],
) {
  const route = ctx.net.routes.get(journey.routeId)!;
  out[from] = at;
  for (let k = from + 1; k < route.stops.length; k++) {
    const priorSec =
      (route.stops[k]!.offsetMin - route.stops[k - 1]!.offsetMin) * 60;
    const seg = segmentInto(ctx.net, route, k);
    at += ctx.typical(seg.id, bucketAt(at, ctx.tz), priorSec) * 1000;
    out[k] = at;
  }
  return out;
}

/** Departure + learned typical times, per stop seq. With no history this is the timetable. */
export function expectedTimes(
  ctx: PredictCtx,
  journey: Journey,
  date: string,
): number[] {
  return chain(
    ctx,
    journey,
    0,
    dayStart(date, ctx.tz) + journey.departureMin * MIN,
    [],
  );
}

/**
 * Live prediction per stop seq. Active trips chain from the anchor at the last
 * stop seen; trips that haven't started use the expected times. Either way, if
 * the next stop's estimate is already past with no event there, the rest of the
 * chain shifts so that stop is "now" (overdue clamp).
 */
export function estimatedTimes(
  ctx: PredictCtx,
  journey: Journey,
  expected: number[],
  trip?: TripState,
): number[] {
  const active =
    trip?.status === "active" &&
    trip.lastSeq !== null &&
    trip.anchorAt !== null;
  const est = active
    ? chain(ctx, journey, trip.lastSeq!, trip.anchorAt!, [...expected])
    : [...expected];
  const next = active ? trip.lastSeq! + 1 : 0;
  if (next < est.length && est[next]! < ctx.now) {
    const shift = ctx.now - est[next]!;
    for (let k = next; k < est.length; k++) est[k]! += shift;
  }
  return est;
}

/** Positive = late, negative = early, in whole minutes. */
export function lateMinutes(estimated: number, expected: number): number {
  return Math.round((estimated - expected) / MIN);
}

export const isOnTime = (lateMin: number) => Math.abs(lateMin) < 2;
