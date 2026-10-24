/** @format */

// Ground truth the timetable gets wrong: each route really takes ~15 min longer
// than timetabled, spread over its segments, with ±10% noise per trip.

import { LAST_DEPARTURE_HOUR, ROUTES, stopId } from "@app/db/network";
import type { DemoJourney } from "./types";

export const TIMETABLE_ERROR_MIN = 15;
const NOISE = 0.1;

/** Small seeded PRNG so a rehearsal and the recording see the same "reality". */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoJourney(
  routeCode: string,
  departureMin: number,
): DemoJourney {
  const route = ROUTES.find((r) => r.code === routeCode)!;
  const offsets = route.stops.map(([, off]) => off);
  const total = offsets.at(-1)!;
  const factor = (total + TIMETABLE_ERROR_MIN) / total;
  const noise = rng(departureMin);
  const realOffsets = [0];
  for (let k = 1; k < offsets.length; k++) {
    const seg =
      (offsets[k]! - offsets[k - 1]!) *
      factor *
      (1 + (noise() * 2 - 1) * NOISE);
    realOffsets.push(realOffsets[k - 1]! + seg);
  }
  const h = Math.round((departureMin - route.firstDeparture) / 60);
  return {
    routeCode,
    busId: `${routeCode}-${h % 2 === 0 ? "A" : "B"}`,
    departureMin,
    realOffsets,
  };
}

/** UP departures of a route, minutes after midnight. */
export function departures(routeCode: string): number[] {
  const route = ROUTES.find((r) => r.code === routeCode)!;
  const out = [];
  for (
    let m = route.firstDeparture;
    m <= LAST_DEPARTURE_HOUR * 60 + 59;
    m += 60
  )
    out.push(m);
  return out;
}

export const stopIdsOf = (routeCode: string) =>
  ROUTES.find((r) => r.code === routeCode)!.stops.map(([name]) => stopId(name));

export const stopNamesOf = (routeCode: string) =>
  ROUTES.find((r) => r.code === routeCode)!.stops.map(([name]) => name);
