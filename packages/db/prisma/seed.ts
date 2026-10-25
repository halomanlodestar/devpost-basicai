/** @format */

// Seeds the demo network, fleet and emitters. Wipes everything first (dev only).
// Emitter secrets are printed to scripts/replay/.env for the replay script.

import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { createDb } from "../src";
import type {
  SeedBus,
  SeedJourney,
  SeedRoute,
  StopPair,
  TimedStop,
} from "../src/types";
import { LAST_DEPARTURE_HOUR, ROUTES, stopId } from "./network";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const db = createDb(DATABASE_URL);

const routes: SeedRoute[] = ROUTES.flatMap((r) => {
  const total = r.stops.at(-1)![1];
  const down = [...r.stops]
    .reverse()
    .map(([name, off]) => [name, total - off] as TimedStop);
  const label = (s: TimedStop[]) => `${r.name} · ${s[0]![0]} → ${s.at(-1)![0]}`;
  return [
    {
      id: `${r.code}-UP`,
      name: label(r.stops),
      reverseOfId: null,
      stops: r.stops,
    },
    {
      id: `${r.code}-DN`,
      name: label(down),
      reverseOfId: `${r.code}-UP`,
      stops: down,
    },
  ];
});

const stopNames = [...new Set(routes.flatMap((r) => r.stops.map(([n]) => n)))];
const segmentPairs = new Map<string, StopPair>();
for (const r of routes)
  for (let i = 1; i < r.stops.length; i++) {
    const pair: StopPair = [stopId(r.stops[i - 1]![0]), stopId(r.stops[i]![0])];
    segmentPairs.set(pair.join(">"), pair);
  }

// Two buses per route alternate hourly UP departures; each comes back DN an hour later.
const buses: SeedBus[] = [];
const journeys: SeedJourney[] = [];
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
ROUTES.forEach((r, ri) => {
  const pair = ["A", "B"].map((s, si) => ({
    id: `${r.code}-${s}`,
    regNo: `UP14 BT ${1101 + ri * 10 + si}`,
  }));
  buses.push(...pair);
  for (
    let h = 0;
    r.firstDeparture + h * 60 <= LAST_DEPARTURE_HOUR * 60 + 59;
    h++
  ) {
    const up = r.firstDeparture + h * 60;
    const bus = pair[h % 2]!.id;
    journeys.push({
      id: `${r.code}-UP-${hhmm(up)}`,
      routeId: `${r.code}-UP`,
      busId: bus,
      departureMin: up,
    });
    journeys.push({
      id: `${r.code}-DN-${hhmm(up + 60)}`,
      routeId: `${r.code}-DN`,
      busId: bus,
      departureMin: up + 60,
    });
  }
});

const emitters = buses.map((b) => ({
  id: `EM-${b.id}`,
  busId: b.id,
  secret: randomBytes(32).toString("hex"),
}));

await db.$transaction([
  db.$executeRawUnsafe(
    `TRUNCATE "segment_stat", "ticket_event", "trip", "journey", "emitter", "bus", "route_stop", "route", "segment", "stop" CASCADE`,
  ),
  db.stop.createMany({
    data: stopNames.map((name) => ({ id: stopId(name), name })),
  }),
  db.segment.createMany({
    data: [...segmentPairs.values()].map(([fromStopId, toStopId]) => ({
      fromStopId,
      toStopId,
    })),
  }),
  db.route.createMany({ data: routes.map(({ id, name }) => ({ id, name })) }),
  ...routes
    .filter((r) => r.reverseOfId)
    .map((r) =>
      db.route.update({
        where: { id: r.id },
        data: { reverseOfId: r.reverseOfId },
      }),
    ),
  db.routeStop.createMany({
    data: routes.flatMap((r) =>
      r.stops.map(([name, offsetMin], seq) => ({
        routeId: r.id,
        seq,
        stopId: stopId(name),
        offsetMin,
      })),
    ),
  }),
  db.bus.createMany({ data: buses }),
  db.emitter.createMany({
    data: emitters,
  }),
  db.journey.createMany({ data: journeys }),
]);

const envPath = join(import.meta.dir, "../../../scripts/replay/.env");
await Bun.write(
  envPath,
  `# Written by db:seed. Emitter id → HMAC secret, like keys issued to real devices.\n` +
    `EMITTER_SECRETS=${emitters.map((e) => `${e.id}:${e.secret}`).join(",")}\n`,
);

console.log(
  `seeded ${stopNames.length} stops, ${routes.length} routes, ${segmentPairs.size} segments, ` +
    `${buses.length} buses, ${journeys.length} journeys; emitter secrets → scripts/replay/.env`,
);
await db.$disconnect();
