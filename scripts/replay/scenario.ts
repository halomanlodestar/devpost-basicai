/** @format */

// --scenario demo: plays the conductors of bus 1 (ABES College → Mohan Nagar)
// for back-to-back journeys whose timetable is ~15 min optimistic, narrating
// each beat for the recording: the first journey drifts from the timetable to
// reality, the next one opens already corrected, a dead-zone batch lands in the
// right order, a forged event bounces, and a re-send counts as a duplicate.
//
// With --speed N the waits are N× shorter and ticket times run on the same
// fast clock, so a rehearsal still teaches the API realistic segment times.
// Wipe it before recording: `bun run db:reset-learning`, then restart the API.

import { dayStart, MIN, minuteOfDay, serviceDate } from "@app/core";
import type { IngestResponse, PlanResult, WireEvent } from "@app/core/types";
import { departures, demoJourney, stopIdsOf, stopNamesOf } from "./reality";
import { event, INGEST_URL, send } from "./send";
import type {
  DemoJourney,
  Emitter,
  ScenarioOptions,
  Step,
  TrpcQueryResponse,
} from "./types";

const ROUTE = "R1";

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });

function log(at: number, msg: string) {
  console.log(`[${clock(at)}] ${msg}`);
}

/** What the rider (searching opts.from → opts.to) sees for a journey right now. */
async function riderView(
  opts: ScenarioOptions,
  journeyId: string,
): Promise<string> {
  const input = encodeURIComponent(
    JSON.stringify({ from: opts.from, to: opts.to }),
  );
  const res = await fetch(`${INGEST_URL}/trpc/plan.search?input=${input}`);
  const r = ((await res.json()) as TrpcQueryResponse<PlanResult>).result.data;

  if (r.kind !== "ok") return r.kind;

  const j = r.options
    .flatMap((o) => o.journeys)
    .find((x) => x.legs[0]!.journeyId === journeyId);

  if (!j) return "already passed your stop";

  return `there by ${clock(j.arriveBy)} (${j.status === "active" ? `${j.lateMin} min late` : "not started"})`;
}

export async function runDemo(
  emitters: Map<string, Emitter>,
  opts: ScenarioOptions,
) {
  const realStart = Date.now();
  const toVirtual = (real: number) =>
    realStart + (real - realStart) * opts.speed;
  const day = dayStart(serviceDate(realStart));

  // the departure nearest to now plays first, so the trip resolves to it
  const nowMin = minuteOfDay(realStart);
  const deps = departures(ROUTE);
  const first = deps.reduce((a, b) =>
    Math.abs(b - nowMin) < Math.abs(a - nowMin) ? b : a,
  );
  const journeys: DemoJourney[] = deps
    .slice(deps.indexOf(first), deps.indexOf(first) + opts.journeys)
    .map((d) => demoJourney(ROUTE, d));

  if (journeys.length === 0) throw new Error("no departures left today");

  const ids = stopIdsOf(ROUTE);
  const names = stopNamesOf(ROUTE);
  const steps: Step[] = [];
  const idOf = (j: DemoJourney) =>
    `${ROUTE}-UP-${String(Math.floor(j.departureMin / 60)).padStart(2, "0")}${String(j.departureMin % 60).padStart(2, "0")}`;

  journeys.forEach((j, n) => {
    const emitter = emitters.get(`EM-${j.busId}`)!;
    // journey n leaves `n` hours after the first, at its real (not timetabled) pace
    const leave = realStart + n * 60 * MIN;
    const atStop = (k: number) => leave + j.realOffsets[k]! * MIN;
    const next = journeys[n + 1];
    const tell = async (at: number, what: string, ev: WireEvent[]) => {
      const r = await send(emitter, ev);
      const body = r.body as IngestResponse;

      log(at, `${what} → ${r.status} ${JSON.stringify(body)}`);
      log(at, `  rider sees ${idOf(j)}: ${await riderView(opts, idOf(j))}`);

      if (next)
        log(
          at,
          `  next journey ${idOf(next)}: ${await riderView(opts, idOf(next))}`,
        );
    };

    const ticket = (k: number, extraMin = 0) => {
      const at = atStop(k) + extraMin * MIN;

      steps.push({
        at,
        run: () =>
          tell(at, `bus ${j.busId} ticket at ${names[k]}`, [
            event(ids[k]!, at),
          ]),
      });
    };

    ticket(0);
    ticket(0, 1); // a second passenger at the same stop: only "last seen" moves
    ticket(1);

    if (n === 0) {
      const dup = event(ids[2]!, atStop(2));
      steps.push({
        at: atStop(2),
        run: async () => {
          await tell(atStop(2), `bus ${j.busId} ticket at ${names[2]}`, [dup]);
          const again = await send(emitter, [dup]);
          log(
            atStop(2),
            `network retry re-sends it → ${again.status} ${JSON.stringify(again.body)} (counted once)`,
          );
          const forged = await send(
            emitter,
            [event(ids[3]!, atStop(2) + MIN)],
            { forge: true },
          );
          log(
            atStop(2),
            `forged event for this bus → ${forged.status} (rejected, nothing changes)`,
          );
        },
      });
      // Hapur Chungi (3) gets no ticket: the gap 2 → 4 is split across both segments
      // dead zone: Raj Nagar (4) and Navyug Market (5) are held, flushed at Kavi Nagar (6)
      steps.push({
        at: atStop(4),
        run: async () =>
          log(
            atStop(4),
            `dead zone: holding the ${names[4]} ticket on the device`,
          ),
      });
      steps.push({
        at: atStop(6),
        run: () =>
          tell(
            atStop(6),
            `back online: flushing ${names[5]}, ${names[4]}, ${names[6]} as one batch (out of order)`,
            [
              event(ids[5]!, atStop(5)),
              event(ids[4]!, atStop(4)),
              event(ids[6]!, atStop(6)),
            ],
          ),
      });
    } else {
      for (const k of [2, 3, 4, 5, 6]) ticket(k);
    }
    ticket(7);
  });

  steps.sort((a, b) => a.at - b.at);
  const firstDep = day + journeys[0]!.departureMin * MIN;
  log(
    realStart,
    `demo: ${journeys.length} journeys of bus 1, timetable ~15 min optimistic, speed ×${opts.speed}`,
  );
  log(
    realStart,
    `first up: ${idOf(journeys[0]!)} (timetabled ${clock(firstDep)}), rider searches ${opts.from} → ${opts.to}`,
  );
  for (const j of journeys)
    log(
      realStart,
      `  ${idOf(j)} before any tickets: ${await riderView(opts, idOf(j))}`,
    );

  for (const step of steps) {
    const realAt = realStart + (step.at - realStart) / opts.speed;
    const wait = realAt - Date.now();
    if (wait > 0) await Bun.sleep(wait);
    await step.run();
  }
  log(toVirtual(Date.now()), "demo finished");
}
