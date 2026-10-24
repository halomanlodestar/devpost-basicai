/** @format */

import { describe, expect, test } from "bun:test";
import { plan } from "../src/plan";
import { BUFFER_MS, timetableOnly } from "../src/predict";
import { SERVICE_TZ } from "../src/time";
import type { PredictCtx } from "../src/types";
import { at, net } from "./fixture";

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

  test("a silent overdue journey is flagged, listed after reporting buses, then dropped after the grace window", () => {
    const late = plan(ctx("08:40"), "B", "D", noTrips);
    if (late.kind !== "ok") throw new Error(late.kind);
    const [first, ghost] = late.options[0]!.journeys;
    expect(first!.legs[0]!.journeyId).toBe("R-UP-0900");
    expect(first!.overdue).toBe(false);
    expect(late.options[0]!.next.legs[0]!.journeyId).toBe("R-UP-0900");
    expect(ghost!.legs[0]!.journeyId).toBe("R-UP-0800");
    expect(ghost!.overdue).toBe(true);
    expect(ghost!.legs[0]!.boardEst).toBeGreaterThanOrEqual(at("08:40"));

    const gone = plan(ctx("10:15"), "B", "D", noTrips);
    if (gone.kind !== "ok") throw new Error(gone.kind);
    expect(gone.options[0]!.journeys.map((x) => x.legs[0]!.journeyId)).toEqual([
      "R-UP-0900",
    ]);
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
    const r = plan(ctx("08:40"), "B", "D", trips);
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

  test("after the last catchable journey: no_more_today with tomorrow's first", () => {
    const r = plan(ctx("23:00"), "B", "D", noTrips);
    expect(r.kind).toBe("no_more_today");
    if (r.kind !== "no_more_today") return;
    expect(r.tomorrowFirst).toBe(at("08:10") + 24 * 60 * 60_000 - BUFFER_MS);
  });
});
