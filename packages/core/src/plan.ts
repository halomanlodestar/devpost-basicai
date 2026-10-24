/** @format */

// From X to Y: route patterns, today's catchable journeys, options (spec > Planner).
// Round 0 (direct) for now; transfer rounds arrive in slice 5.

import {
  BUFFER_MS,
  estimatedTimes,
  expectedTimes,
  lateMinutes,
} from "./predict";
import { addDays, MIN, serviceDate } from "./time";
import type {
  Journey,
  JourneyView,
  Network,
  Option,
  Pattern,
  PatternLeg,
  PlanResult,
  PredictCtx,
  TripLookup,
} from "./types";

/**
 * A journey that never reported is dropped once its expected time at the stop is
 * this far behind us: trip resolution can no longer start it (spec > Trip Resolution, ±120 min).
 */
export const NOT_STARTED_GRACE_MS = 120 * MIN;

export function directPatterns(
  net: Network,
  from: string,
  to: string,
): Pattern[] {
  const out: Pattern[] = [];

  for (const { routeId, seq } of net.stopRoutes.get(from) ?? []) {
    const alight = net.seqOf.get(routeId)!.get(to);

    if (alight !== undefined && alight > seq)
      out.push({
        id: routeId,
        legs: [{ routeId, boardSeq: seq, alightSeq: alight }],
        changeStopIds: [],
      });
  }

  return out;
}

export function findPatterns(
  net: Network,
  from: string,
  to: string,
): Pattern[] {
  return directPatterns(net, from, to);
}

function legView(
  ctx: PredictCtx,
  trips: TripLookup,
  journey: Journey,
  date: string,
  leg: PatternLeg,
) {
  const trip = trips(journey.id, date);

  if (trip?.status === "completed") return null;

  const active = trip?.status === "active" && trip.lastSeq !== null;

  if (active && trip.lastSeq! >= leg.boardSeq) return null; // already passed X

  const expected = expectedTimes(ctx, journey, date);

  if (!active && ctx.now - expected[leg.boardSeq]! > NOT_STARTED_GRACE_MS)
    return null;

  const estimated = estimatedTimes(ctx, journey, expected, trip);

  return { trip: active ? trip : undefined, expected, estimated };
}

function journeyView(
  ctx: PredictCtx,
  trips: TripLookup,
  pattern: Pattern,
  journey: Journey,
  date: string,
): JourneyView | null {
  const leg = pattern.legs[0]!;
  const v = legView(ctx, trips, journey, date, leg);

  if (!v) return null;

  const route = ctx.net.routes.get(leg.routeId)!;
  const board = route.stops[leg.boardSeq]!.stopId;
  const alight = route.stops[leg.alightSeq]!.stopId;
  const boardEst = v.estimated[leg.boardSeq]!;
  const alightEst = v.estimated[leg.alightSeq]!;

  return {
    id: `${journey.id}@${date}`,
    serviceDate: date,
    legs: [
      {
        routeId: route.id,
        routeName: route.name,
        journeyId: journey.id,
        boardStopId: board,
        boardStopName: ctx.net.stops.get(board)!.name,
        boardEst,
        alightStopId: alight,
        alightStopName: ctx.net.stops.get(alight)!.name,
        alightEst,
      },
    ],
    beAtStopBy: boardEst - BUFFER_MS,
    arriveBy: alightEst + BUFFER_MS,
    expectedX: v.expected[leg.boardSeq]!,
    lateMin: lateMinutes(boardEst, v.expected[leg.boardSeq]!),
    status: v.trip ? "active" : "not_started",
    lastSeen:
      v.trip?.lastStopId && v.trip.lastSeenAt
        ? {
            stopName: ctx.net.stops.get(v.trip.lastStopId)!.name,
            at: v.trip.lastSeenAt,
          }
        : undefined,
  };
}

export function plan(
  ctx: PredictCtx,
  from: string,
  to: string,
  trips: TripLookup,
): PlanResult {
  const patterns = findPatterns(ctx.net, from, to);

  if (patterns.length === 0)
    return {
      kind: "no_route",
      reverseServed: findPatterns(ctx.net, to, from).length > 0,
    };

  const today = serviceDate(ctx.now, ctx.tz);
  const options: Option[] = [];

  for (const pattern of patterns) {
    const journeys = (
      ctx.net.journeysByRoute.get(pattern.legs[0]!.routeId) ?? []
    )
      .map((j) => journeyView(ctx, trips, pattern, j, today))
      .filter((v): v is JourneyView => v !== null)
      .sort((a, b) => a.beAtStopBy - b.beAtStopBy);

    if (journeys.length === 0) continue;

    const routeNames = pattern.legs.map(
      (l) => ctx.net.routes.get(l.routeId)!.name,
    );

    options.push({
      id: pattern.id,
      routes: routeNames,
      changes: pattern.legs.length - 1,
      changeStops: pattern.changeStopIds.map((s) => ctx.net.stops.get(s)!.name),
      next: journeys[0]!,
      journeys,
    });
  }

  if (options.length === 0)
    return {
      kind: "no_more_today",
      tomorrowFirst: tomorrowFirst(ctx, patterns, today),
    };

  options.sort((a, b) => a.next.arriveBy - b.next.arriveBy);

  return { kind: "ok", generatedAt: ctx.now, options };
}

function tomorrowFirst(
  ctx: PredictCtx,
  patterns: Pattern[],
  today: string,
): number | undefined {
  const tomorrow = addDays(today, 1);
  let first: number | undefined;

  for (const { legs } of patterns) {
    const j = ctx.net.journeysByRoute.get(legs[0]!.routeId)?.[0];

    if (!j) continue;

    const at = expectedTimes(ctx, j, tomorrow)[legs[0]!.boardSeq]! - BUFFER_MS;

    if (first === undefined || at < first) first = at;
  }

  return first;
}
