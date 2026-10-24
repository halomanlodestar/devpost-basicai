/** @format */

// One transaction per batch: dedupe → resolve → trip state (spec > Ingest).
// Memory is updated only after the commit, so a failed batch leaves no trace.

import { ingestEvent, serviceDate, timetableOnly } from "@app/core";
import type { IngestResponse, TripState, WireEvent } from "@app/core/types";
import type { Db } from "@app/db";
import { tripKey } from "../state";
import type {
  BatchResult,
  OverlayStore,
  State,
  VerifiedEmitter,
} from "../types";

function overlay(state: State): OverlayStore {
  const changes = new Map<string, TripState>();

  return {
    changes,
    get: (j, d) => changes.get(tripKey(j, d)) ?? state.trips.get(tripKey(j, d)),
    set: (j, d, t) => void changes.set(tripKey(j, d), t),
  };
}

const toRow = (t: TripState) => ({
  status: t.status,
  lastSeq: t.lastSeq,
  lastStopId: t.lastStopId,
  anchorAt: t.anchorAt === null ? null : new Date(t.anchorAt),
  lastSeenAt: t.lastSeenAt === null ? null : new Date(t.lastSeenAt),
});

let queue: Promise<unknown> = Promise.resolve();

/** Batches apply one at a time: trip resolution reads state the previous batch wrote. */
function serially<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);

  queue = run.catch(() => undefined);

  return run;
}

export function applyBatch(
  db: Db,
  state: State,
  tz: string,
  emitter: VerifiedEmitter,
  events: WireEvent[],
): Promise<BatchResult> {
  return serially(async () => {
    const store = overlay(state);
    const ctx = { net: state.net, typical: timetableOnly, tz, now: Date.now() };
    const response: IngestResponse = {
      accepted: 0,
      duplicates: 0,
      unassigned: 0,
    };
    const sorted = events
      .map((e) => ({ ...e, at: Date.parse(e.occurredAt) }))
      .sort((a, b) => a.at - b.at);

    await db.$transaction(async (tx) => {
      for (const e of sorted) {
        const [row] = await tx.ticketEvent.createManyAndReturn({
          data: [
            {
              emitterId: emitter.id,
              idempotencyKey: e.idempotencyKey,
              stopId: e.stopId,
              occurredAt: new Date(e.at),
            },
          ],
          skipDuplicates: true,
          select: { id: true },
        });

        if (!row) {
          response.duplicates++;
          continue;
        }

        response.accepted++;

        const ev = { stopId: e.stopId, occurredAt: e.at };
        const { resolution, touched } = ingestEvent(
          ctx,
          store,
          emitter.busId,
          ev,
        );

        if (resolution.kind === "unassigned") {
          response.unassigned++;
          continue;
        }

        const date = serviceDate(e.at, tz);
        const ids = new Map<string, string>();

        for (const journeyId of new Set([...touched, resolution.journeyId])) {
          const trip = store.get(journeyId, date)!;
          const saved = await tx.trip.upsert({
            where: { journeyId_serviceDate: { journeyId, serviceDate: date } },
            create: { journeyId, serviceDate: date, ...toRow(trip) },
            update: toRow(trip),
            select: { id: true },
          });

          ids.set(journeyId, saved.id);
        }

        await tx.ticketEvent.update({
          where: { id: row.id },
          data: { tripId: ids.get(resolution.journeyId) },
        });
      }
    });

    const routeIds = new Set<string>();

    for (const [key, trip] of store.changes) {
      state.trips.set(key, trip);
      routeIds.add(state.net.journeys.get(key.split("@")[0]!)!.routeId);
    }

    return { response, routeIds };
  });
}
