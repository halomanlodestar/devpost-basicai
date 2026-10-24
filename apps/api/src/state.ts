/** @format */

import { buildNetwork } from "@app/core";
import type { StatBucket, StatsStore } from "@app/core/types";
import type { Db } from "@app/db";
import type { State } from "./types";

export const tripKey = (journeyId: string, serviceDate: string) =>
  `${journeyId}@${serviceDate}`;

export const statKey = (segmentId: string, bucket: StatBucket) =>
  `${segmentId}:${bucket}`;

/** Read-only view of the learned times in memory. */
export function statsOf(state: State): StatsStore {
  return {
    get: (s, b) => state.stats.get(statKey(s, b)),
    set: () => {
      throw new Error("learned times change only through ingest");
    },
  };
}

export async function loadState(db: Db): Promise<State> {
  const [stops, routes, journeys, segments, trips, stats] = await Promise.all([
    db.stop.findMany(),
    db.route.findMany({ include: { stops: true } }),
    db.journey.findMany(),
    db.segment.findMany(),
    db.trip.findMany({ where: { status: { not: "completed" } } }),
    db.segmentStat.findMany(),
  ]);

  const net = buildNetwork({
    stops,
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      reverseOfId: r.reverseOfId,
      stops: r.stops.map(({ stopId, seq, offsetMin }) => ({
        stopId,
        seq,
        offsetMin,
      })),
    })),
    journeys,
    segments,
  });

  return {
    net,
    trips: new Map(
      trips.map((t) => [
        tripKey(t.journeyId, t.serviceDate),
        {
          status: t.status,
          lastSeq: t.lastSeq,
          lastStopId: t.lastStopId,
          anchorAt: t.anchorAt?.getTime() ?? null,
          lastSeenAt: t.lastSeenAt?.getTime() ?? null,
        },
      ]),
    ),
    stats: new Map(
      stats.map((r) => [
        statKey(r.segmentId, r.bucket),
        {
          typicalSec: r.typicalSec,
          samples: r.samples,
          rejected: r.rejected,
          pendingCount: r.pendingCount,
          pendingMeanSec: r.pendingMeanSec,
        },
      ]),
    ),
  };
}
