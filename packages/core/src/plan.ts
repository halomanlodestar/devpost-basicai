/** @format */

// From X to Y: route patterns, today's catchable journeys, options (spec > Planner).
// RAPTOR-style rounds: round k = k changes (max 2). A higher round is only
// explored when the lower one found nothing; the 3 fastest options are kept.

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
  Leg,
  LegCalc,
  Network,
  Option,
  Pattern,
  PatternLeg,
  PlanResult,
  PredictCtx,
  TripLookup,
} from "./types";

/** A transfer is catchable if the next bus reaches the change stop this long after the first one. */
export const CONNECTION_BUFFER_MS = 5 * MIN;
export const MAX_CHANGES = 2;
/** Results show at most this many ways to go, fastest first. */
export const MAX_OPTIONS = 3;

const patternId = (legs: PatternLeg[], changes: string[]) =>
  legs
    .map((l, i) => (i ? `${changes[i - 1]}>${l.routeId}` : l.routeId))
    .join(">");

/**
 * Every way to ride from `from` to `to` with exactly `changes` changes: a route
 * reaching each change stop, then another route on from there. A route is never
 * used twice in one pattern, and a change stop is never the origin or destination.
 */
function patternsWith(
  net: Network,
  from: string,
  to: string,
  changes: number,
): Pattern[] {
  const out: Pattern[] = [];

  const walk = (
    at: string,
    legs: PatternLeg[],
    changeStops: string[],
    used: Set<string>,
  ) => {
    for (const { routeId, seq } of net.stopRoutes.get(at) ?? []) {
      if (used.has(routeId)) continue;

      const route = net.routes.get(routeId)!;

      if (legs.length === changes) {
        const alight = net.seqOf.get(routeId)!.get(to);

        if (alight !== undefined && alight > seq) {
          const all = [...legs, { routeId, boardSeq: seq, alightSeq: alight }];

          out.push({
            id: patternId(all, changeStops),
            legs: all,
            changeStopIds: changeStops,
          });
        }
        continue;
      }

      for (let k = seq + 1; k < route.stops.length; k++) {
        const m = route.stops[k]!.stopId;

        if (m === to || m === from || changeStops.includes(m)) continue;

        walk(
          m,
          [...legs, { routeId, boardSeq: seq, alightSeq: k }],
          [...changeStops, m],
          new Set([...used, routeId]),
        );
      }
    }
  };

  walk(from, [], [], new Set());

  return out;
}

export function directPatterns(
  net: Network,
  from: string,
  to: string,
): Pattern[] {
  return patternsWith(net, from, to, 0);
}

/** The fewest changes that work: direct if any, else 1 change, else 2. */
export function findPatterns(
  net: Network,
  from: string,
  to: string,
): Pattern[] {
  for (let changes = 0; changes <= MAX_CHANGES; changes++) {
    const found = patternsWith(net, from, to, changes);

    if (found.length) return found;
  }

  return [];
}

/** The bus has since started (or finished) a later journey, so it isn't running this one. */
function superseded(
  ctx: PredictCtx,
  trips: TripLookup,
  journey: Journey,
  date: string,
) {
  return (ctx.net.journeysByBus.get(journey.busId) ?? []).some(
    (j) =>
      j.departureMin > journey.departureMin &&
      (trips(j.id, date)?.status ?? "scheduled") !== "scheduled",
  );
}

/** One journey on one leg, or null if the rider can't board it at the leg's board stop. */
function legCalc(
  ctx: PredictCtx,
  trips: TripLookup,
  journey: Journey,
  date: string,
  leg: PatternLeg,
): LegCalc | null {
  const trip = trips(journey.id, date);

  if (trip?.status === "completed") return null;

  const active = trip?.status === "active" && trip.lastSeq !== null;

  if (active && trip.lastSeq! >= leg.boardSeq) return null; // already passed the board stop

  const expected = expectedTimes(ctx, journey, date);

  // never reported and already past due at the board stop: the rider can't act on "might still come"
  if (!active && expected[leg.boardSeq]! < ctx.now) return null;

  if (!active && superseded(ctx, trips, journey, date)) return null;

  const estimated = estimatedTimes(ctx, journey, expected, trip);

  return { leg, journey, trip: active ? trip : undefined, expected, estimated };
}

/** The earliest journey on this leg whose bus reaches the change stop after `readyAt`. */
function connection(
  ctx: PredictCtx,
  trips: TripLookup,
  date: string,
  leg: PatternLeg,
  readyAt: number,
): LegCalc | null {
  let best: LegCalc | null = null;

  for (const j of ctx.net.journeysByRoute.get(leg.routeId) ?? []) {
    const c = legCalc(ctx, trips, j, date, leg);

    if (!c || c.estimated[leg.boardSeq]! < readyAt) continue;
    if (!best || c.estimated[leg.boardSeq]! < best.estimated[leg.boardSeq]!)
      best = c;
  }

  return best;
}

function legOut(
  ctx: PredictCtx,
  c: LegCalc,
  withBusBehind: boolean,
  waitMinBefore?: number,
): Leg {
  const route = ctx.net.routes.get(c.leg.routeId)!;
  const name = (id: string) => ctx.net.stops.get(id)!.name;
  const board = route.stops[c.leg.boardSeq]!.stopId;
  const alight = route.stops[c.leg.alightSeq]!.stopId;
  const from =
    withBusBehind && c.trip
      ? Math.min(c.trip.lastSeq!, c.leg.boardSeq)
      : c.leg.boardSeq;

  return {
    routeId: route.id,
    routeName: route.name,
    journeyId: c.journey.id,
    boardStopId: board,
    boardStopName: name(board),
    boardEst: c.estimated[c.leg.boardSeq]!,
    alightStopId: alight,
    alightStopName: name(alight),
    alightEst: c.estimated[c.leg.alightSeq]!,
    waitMinBefore,
    stops: route.stops.slice(from, c.leg.alightSeq + 1).map((rs) => ({
      stopId: rs.stopId,
      name: name(rs.stopId),
      est: c.estimated[rs.seq]!,
    })),
  };
}

/**
 * A journey starting with `first` on the pattern's first leg, each later leg the
 * first bus that can still be caught at the change stop, from live predictions.
 * If the first bus runs late, the next recompute simply picks a later connection.
 */
function journeyView(
  ctx: PredictCtx,
  trips: TripLookup,
  pattern: Pattern,
  first: Journey,
  date: string,
): JourneyView | null {
  const c0 = legCalc(ctx, trips, first, date, pattern.legs[0]!);

  if (!c0) return null;

  const legs: Leg[] = [legOut(ctx, c0, true)];
  let prev = c0;

  for (const leg of pattern.legs.slice(1)) {
    const arrived = prev.estimated[prev.leg.alightSeq]!;
    const next = connection(
      ctx,
      trips,
      date,
      leg,
      arrived + CONNECTION_BUFFER_MS,
    );

    if (!next) return null; // no connection left today

    legs.push(
      legOut(
        ctx,
        next,
        false,
        Math.round((next.estimated[leg.boardSeq]! - arrived) / MIN),
      ),
    );
    prev = next;
  }

  const boardEst = legs[0]!.boardEst;
  const expectedX = c0.expected[pattern.legs[0]!.boardSeq]!;

  return {
    id: `${legs.map((l) => l.journeyId).join("+")}@${date}`,
    serviceDate: date,
    legs,
    beAtStopBy: boardEst - BUFFER_MS,
    arriveBy: legs.at(-1)!.alightEst + BUFFER_MS,
    expectedX,
    lateMin: lateMinutes(boardEst, expectedX),
    status: c0.trip ? "active" : "not_started",
    lastSeen:
      c0.trip?.lastStopId && c0.trip.lastSeenAt
        ? {
            stopName: ctx.net.stops.get(c0.trip.lastStopId)!.name,
            at: c0.trip.lastSeenAt,
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
    const seen = new Set<string>();
    const journeys = (
      ctx.net.journeysByRoute.get(pattern.legs[0]!.routeId) ?? []
    )
      .map((j) => journeyView(ctx, trips, pattern, j, today))
      .filter((v): v is JourneyView => v !== null)
      .sort((a, b) => a.beAtStopBy - b.beAtStopBy)
      // two first buses that make the same connection: keep the later one (less waiting)
      .reverse()
      .filter((v) => {
        const tail = v.legs
          .slice(1)
          .map((l) => l.journeyId)
          .join("+");

        if (!tail) return true;
        if (seen.has(tail)) return false;
        seen.add(tail);

        return true;
      })
      .reverse();

    if (journeys.length === 0) continue;

    options.push({
      id: pattern.id,
      routes: pattern.legs.map((l) => ctx.net.routes.get(l.routeId)!.name),
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

  // the same buses changing at different shared stops: keep the fastest (sorted first)
  const byRoutes = new Set<string>();
  const distinct = options.filter((o) => {
    const key = o.routes.join("+");

    if (byRoutes.has(key)) return false;
    byRoutes.add(key);

    return true;
  });

  return {
    kind: "ok",
    generatedAt: ctx.now,
    options: distinct.slice(0, MAX_OPTIONS),
  };
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
