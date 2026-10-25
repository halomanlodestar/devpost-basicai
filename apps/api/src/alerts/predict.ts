/** @format */

import {
  BUFFER_MS,
  estimatedTimes,
  expectedTimes,
  lateMinutes,
  typicalFrom,
} from "@app/core";
import { statsOf, tripKey } from "../state";
import type { AlertPrediction, OpenAlert, State } from "../types";

/** The rider's bus at their stop, right now, from memory only. */
export function predictAlert(
  state: State,
  tz: string,
  a: OpenAlert,
): AlertPrediction | null {
  const journey = state.net.journeys.get(a.journeyId);
  const route = journey && state.net.routes.get(journey.routeId);
  const seq = route && state.net.seqOf.get(route.id)!.get(a.fromStopId);

  if (!journey || !route || seq === undefined) return null;

  const ctx = {
    net: state.net,
    typical: typicalFrom(statsOf(state)),
    tz,
    now: Date.now(),
  };
  const trip = state.trips.get(tripKey(a.journeyId, a.serviceDate));
  const expected = expectedTimes(ctx, journey, a.serviceDate);
  const est = estimatedTimes(ctx, journey, expected, trip);
  const active = trip?.status === "active";
  const passed =
    trip?.status === "completed" ||
    (active && trip.lastSeq !== null && trip.lastSeq >= seq);

  return {
    routeName: route.name,
    stopName: state.net.stops.get(a.fromStopId)!.name,
    beAtStopBy: est[seq]! - BUFFER_MS,
    lateMin: active ? lateMinutes(est[seq]!, expected[seq]!) : 0,
    done: passed || est[seq]! < ctx.now,
  };
}
