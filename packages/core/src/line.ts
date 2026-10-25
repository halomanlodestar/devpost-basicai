/** @format */

// One route end to end (spec > Web App Screens, line view): its stops, every bus
// live on it right now, and the rider's own bus's time at each stop.

import { estimatedTimes, expectedTimes, lateMinutes } from "./predict";
import { serviceDate } from "./time";
import type { LineBus, LineView, PredictCtx, TripLookup } from "./types";

export function lineView(
  ctx: PredictCtx,
  routeId: string,
  trips: TripLookup,
  journeyId?: string,
): LineView | null {
  const route = ctx.net.routes.get(routeId);

  if (!route) return null;

  const date = serviceDate(ctx.now, ctx.tz);
  const buses: LineBus[] = [];

  for (const j of ctx.net.journeysByRoute.get(routeId) ?? []) {
    const trip = trips(j.id, date);

    if (trip?.status !== "active" || trip.lastSeq === null || !trip.lastSeenAt)
      continue;

    const expected = expectedTimes(ctx, j, date);
    const est = estimatedTimes(ctx, j, expected, trip);
    const next = Math.min(trip.lastSeq + 1, route.stops.length - 1);

    buses.push({
      journeyId: j.id,
      afterSeq: trip.lastSeq,
      lateMin: lateMinutes(est[next]!, expected[next]!),
      lastSeen: {
        stopName: ctx.net.stops.get(trip.lastStopId!)!.name,
        at: trip.lastSeenAt,
      },
    });
  }

  const mine = journeyId ? ctx.net.journeys.get(journeyId) : undefined;
  let est: number[] | undefined;
  let passedSeq = -1;

  if (mine && mine.routeId === routeId) {
    const trip = trips(mine.id, date);

    est = estimatedTimes(ctx, mine, expectedTimes(ctx, mine, date), trip);
    passedSeq = trip?.status === "active" ? (trip.lastSeq ?? -1) : -1;
  }

  return {
    routeId,
    routeName: route.name,
    journeyId: est ? journeyId : undefined,
    buses,
    stops: route.stops.map((rs) => ({
      stopId: rs.stopId,
      name: ctx.net.stops.get(rs.stopId)!.name,
      seq: rs.seq,
      est: est && rs.seq > passedSeq ? est[rs.seq] : undefined,
    })),
  };
}
