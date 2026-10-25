/** @format */

import { describe, expect, test } from "bun:test";
import { plan } from "../src/plan";
import { BUFFER_MS, timetableOnly } from "../src/predict";
import { addDays, SERVICE_TZ } from "../src/time";
import type { PredictCtx } from "../src/types";
import { at, DATE, net } from "./fixture";

const ctx = (now: string): PredictCtx => ({
  net,
  typical: timetableOnly,
  tz: SERVICE_TZ,
  now: at(now),
});
const noTrips = () => undefined;

describe("direct planning (round 0)", () => {
  test("a pair served by one route gives one option with no changes", () => {
    const r = plan(ctx("07:00"), "B", "D", noTrips);
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.options.map((o) => o.id)).toEqual(["R-UP"]);
    expect(r.options[0]!.changes).toBe(0);
  });

  test("journeys are nearest first with the 5-min buffer on both ends", () => {
    const r = plan(ctx("07:00"), "B", "D", noTrips);
    if (r.kind !== "ok") throw new Error(r.kind);
    const [first, second] = r.options[0]!.journeys;
    expect(first!.legs[0]!.journeyId).toBe("R-UP-0800");
    expect(second!.legs[0]!.journeyId).toBe("R-UP-0900");
    expect(first!.beAtStopBy).toBe(at("08:10") - BUFFER_MS);
    expect(first!.arriveBy).toBe(at("08:30") + BUFFER_MS);
    expect(first!.status).toBe("not_started");
    expect(first!.lateMin).toBe(0);
  });

  test("direction matters: reverse pair is served by the down route", () => {
    const r = plan(ctx("07:00"), "D", "B", noTrips);
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.options.map((o) => o.id)).toEqual(["R-DN"]);
  });

  test("a silent journey is clamped forward while due, and dropped once it's past due at X", () => {
    // 08:05: the 08:00 bus hasn't reported from A yet, but isn't due at B (08:10) until later
    const early = plan(ctx("08:05"), "B", "D", noTrips);
    if (early.kind !== "ok") throw new Error(early.kind);
    const j = early.options[0]!.journeys[0]!;
    expect(j.legs[0]!.journeyId).toBe("R-UP-0800");
    expect(j.legs[0]!.boardEst).toBe(at("08:15")); // A clamped to now, +10 to B

    // 08:40: past due at B with no report → gone; the 09:00 bus is next
    const late = plan(ctx("08:40"), "B", "D", noTrips);
    if (late.kind !== "ok") throw new Error(late.kind);
    const todays = late.options[0]!.journeys.filter(
      (x) => x.serviceDate === DATE,
    );
    expect(todays.map((x) => x.legs[0]!.journeyId)).toEqual(["R-UP-0900"]);
  });

  test("the timeline runs from the last-seen stop to the destination", () => {
    const trips = (id: string) =>
      id === "R-UP-0800"
        ? {
            status: "active" as const,
            lastSeq: 0,
            lastStopId: "A",
            anchorAt: at("08:03"),
            lastSeenAt: at("08:04"),
          }
        : undefined;
    const r = plan(ctx("08:05"), "B", "D", trips);
    if (r.kind !== "ok") throw new Error(r.kind);
    const stops = r.options[0]!.next.legs[0]!.stops;
    expect(stops.map((s) => s.stopId)).toEqual(["A", "B", "C", "D"]);
    expect(stops.map((s) => s.est)).toEqual([
      at("08:03"),
      at("08:13"),
      at("08:23"),
      at("08:33"),
    ]);

    const notStarted = plan(ctx("08:05"), "B", "D", noTrips);
    if (notStarted.kind !== "ok") throw new Error(notStarted.kind);
    expect(
      notStarted.options[0]!.journeys[1]!.legs[0]!.stops.map((s) => s.stopId),
    ).toEqual(["B", "C", "D"]);
  });

  test("a never-reported journey is hidden once its bus has started a later one", () => {
    // BUS1 runs R-UP-0800 then R-DN-0900; it skipped reporting on 0800 but is now on 0900
    const trips = (id: string) =>
      id === "R-DN-0900"
        ? {
            status: "active" as const,
            lastSeq: 0,
            lastStopId: "D",
            anchorAt: at("09:02"),
            lastSeenAt: at("09:02"),
          }
        : undefined;
    const r = plan(ctx("08:05"), "B", "D", trips);
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.options[0]!.journeys.map((j) => j.legs[0]!.journeyId)).toEqual([
      "R-UP-0900",
    ]);
  });

  test("an active trip that has passed X is hidden", () => {
    const trips = (id: string) =>
      id === "R-UP-0800"
        ? {
            status: "active" as const,
            lastSeq: 2,
            lastStopId: "C",
            anchorAt: at("08:22"),
            lastSeenAt: at("08:23"),
          }
        : undefined;
    const r = plan(ctx("08:25"), "B", "D", trips);
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.options[0]!.journeys[0]!.legs[0]!.journeyId).toBe("R-UP-0900");
  });

  test("no route at all reports whether the reverse is served", () => {
    const r = plan(ctx("07:00"), "B", "B2", noTrips);
    expect(r).toEqual({ kind: "no_route", reverseServed: false });
  });

  test("late at night, tomorrow's buses follow on (next 24 hours)", () => {
    const r = plan(ctx("23:00"), "B", "D", noTrips);
    if (r.kind !== "ok") throw new Error(r.kind);
    const js = r.options[0]!.journeys;
    expect(js.map((x) => [x.legs[0]!.journeyId, x.serviceDate])).toEqual([
      ["R-UP-0800", addDays(DATE, 1)],
      ["R-UP-0900", addDays(DATE, 1)],
    ]);
    expect(js[0]!.beAtStopBy).toBe(at("08:10") + 24 * 60 * 60_000 - BUFFER_MS);
  });

  test("the window is 24 hours: at 08:30 tomorrow's 09:00 bus (09:05 at B) is just out", () => {
    const r = plan(ctx("08:30"), "B", "D", noTrips);
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(
      r.options[0]!.journeys.map(
        (x) => `${x.legs[0]!.journeyId}@${x.serviceDate}`,
      ),
    ).toEqual([`R-UP-0900@${DATE}`, `R-UP-0800@${addDays(DATE, 1)}`]);
  });
});
