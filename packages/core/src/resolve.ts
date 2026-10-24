/** @format */

// Event → trip (spec > Trip Resolution) and forward-only trip state (spec > Trip State).
// The device sends only stop and time; the server decides which trip it belongs to.

import { learnFromAdvance } from "./learn";
import { expectedTimes } from "./predict";
import { MIN, serviceDate } from "./time";
import type {
  IngestResult,
  LearnedSample,
  PredictCtx,
  Resolution,
  StartCandidate,
  StatsStore,
  StopEvent,
  TripState,
  TripStore,
} from "./types";

/** A trip can only be started by an event within this window of its expected time there. */
export const START_WINDOW_MS = 120 * MIN;

function activeTrip(
  ctx: PredictCtx,
  store: TripStore,
  busId: string,
  date: string,
) {
  for (const j of ctx.net.journeysByBus.get(busId) ?? []) {
    const trip = store.get(j.id, date);
    if (trip?.status === "active") return { journey: j, trip };
  }
  return undefined;
}

export function resolveEvent(
  ctx: PredictCtx,
  store: TripStore,
  busId: string,
  ev: StopEvent,
): Resolution {
  const date = serviceDate(ev.occurredAt, ctx.tz);
  const active = activeTrip(ctx, store, busId, date);

  if (active) {
    // out-of-order: older than where the active trip already is
    if (ev.occurredAt < active.trip.anchorAt!)
      return { kind: "stale", journeyId: active.journey.id };
    const seq = ctx.net.seqOf.get(active.journey.routeId)!.get(ev.stopId);
    // 1. the active trip continues to a stop ahead of it
    if (seq !== undefined && seq > active.trip.lastSeq!)
      return { kind: "continue", journeyId: active.journey.id, seq };
    // 2. more tickets where the bus was last seen
    if (ev.stopId === active.trip.lastStopId)
      return { kind: "same_stop", journeyId: active.journey.id };
  }

  // 3. start the journey whose expected time at this stop is closest
  let best: StartCandidate | undefined;
  for (const j of ctx.net.journeysByBus.get(busId) ?? []) {
    if (j.id === active?.journey.id) continue;
    const seq = ctx.net.seqOf.get(j.routeId)!.get(ev.stopId);
    if (seq === undefined) continue;
    if (store.get(j.id, date)?.status === "completed") continue;
    const gap = Math.abs(expectedTimes(ctx, j, date)[seq]! - ev.occurredAt);
    if (gap <= START_WINDOW_MS && (!best || gap < best.gap))
      best = { journey: j, seq, gap };
  }
  if (best)
    return {
      kind: "start",
      journeyId: best.journey.id,
      seq: best.seq,
      completes: active?.journey.id,
    };

  // 4. no match: stored, no effect
  return { kind: "unassigned" };
}

/**
 * Applies one resolved event. Forward only: an event behind the trip's anchor
 * never moves it, so a late dead-zone flush can't pull a bus backwards.
 */
export function applyResolution(
  ctx: PredictCtx,
  store: TripStore,
  r: Resolution,
  ev: StopEvent,
): string[] {
  if (r.kind === "unassigned" || r.kind === "stale") return [];
  const date = serviceDate(ev.occurredAt, ctx.tz);
  const journey = ctx.net.journeys.get(r.journeyId)!;
  const lastSeq = ctx.net.routes.get(journey.routeId)!.stops.length - 1;
  const touched: string[] = [];

  if (r.kind === "start" && r.completes) {
    const prev = store.get(r.completes, date)!;
    store.set(r.completes, date, { ...prev, status: "completed" });
    touched.push(r.completes);
  }

  const trip = store.get(r.journeyId, date);
  if (r.kind === "same_stop") {
    if (!trip || ev.occurredAt <= (trip.lastSeenAt ?? 0)) return touched;
    store.set(r.journeyId, date, { ...trip, lastSeenAt: ev.occurredAt });
    return [...touched, r.journeyId];
  }

  if (trip?.status === "active" && ev.occurredAt < trip.anchorAt!)
    return touched;
  const next: TripState = {
    status: r.seq === lastSeq ? "completed" : "active",
    lastSeq: r.seq,
    lastStopId: ev.stopId,
    anchorAt: ev.occurredAt,
    lastSeenAt: Math.max(ev.occurredAt, trip?.lastSeenAt ?? 0),
  };
  store.set(r.journeyId, date, next);
  return [...touched, r.journeyId];
}

/**
 * Resolve + apply + learn. When the event advances the bus's active trip, the
 * time since its anchor becomes segment samples in `stats`.
 */
export function ingestEvent(
  ctx: PredictCtx,
  store: TripStore,
  busId: string,
  ev: StopEvent,
  stats?: StatsStore,
): IngestResult {
  const resolution = resolveEvent(ctx, store, busId, ev);
  let learned: LearnedSample[] = [];
  if (stats && resolution.kind === "continue") {
    const trip = store.get(
      resolution.journeyId,
      serviceDate(ev.occurredAt, ctx.tz),
    )!;
    learned = learnFromAdvance(ctx, stats, {
      journeyId: resolution.journeyId,
      fromSeq: trip.lastSeq!,
      fromAt: trip.anchorAt!,
      toSeq: resolution.seq,
      toAt: ev.occurredAt,
    });
  }
  return {
    resolution,
    touched: applyResolution(ctx, store, resolution, ev),
    learned,
  };
}
