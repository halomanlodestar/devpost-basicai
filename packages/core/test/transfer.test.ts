/** @format */

import { describe, expect, test } from "bun:test";
import { CONNECTION_BUFFER_MS, findPatterns, plan } from "../src/plan";
import { BUFFER_MS, timetableOnly } from "../src/predict";
import { SERVICE_TZ } from "../src/time";
import type { PredictCtx, TripState } from "../src/types";
import { at, net } from "./fixture";

const ctx = (now: string): PredictCtx => ({
  net,
  typical: timetableOnly,
  tz: SERVICE_TZ,
  now: at(now),
});
const noTrips = () => undefined;

describe("transfer patterns", () => {
  test("direct wins: no change is explored when a single bus does it", () => {
    expect(findPatterns(net, "A", "D").map((p) => p.legs.length)).toEqual([1]);
  });

  test("no direct bus: one change at the shared stop", () => {
    const [p, ...rest] = findPatterns(net, "A", "F");
    expect(rest).toHaveLength(0);
    expect(p!.legs.map((l) => l.routeId)).toEqual(["R-UP", "S-UP"]);
    expect(p!.changeStopIds).toEqual(["C"]);
  });

  test("nothing connects: no pattern, and the reverse isn't served either", () => {
    expect(findPatterns(net, "F", "A")).toEqual([]);
  });
});

describe("transfer journeys", () => {
  test("each first bus is chained to the first catchable connection, with the wait", () => {
    const r = plan(ctx("07:00"), "A", "F", noTrips);
    if (r.kind !== "ok") throw new Error(r.kind);
    const o = r.options[0]!;
    expect(o.changes).toBe(1);
    expect(o.changeStops).toEqual(["Stop C"]);

    const [j1, j2] = o.journeys;
    // 08:00 R reaches C 08:20 → S 08:40 leaves C → 20 min wait
    expect(j1!.legs.map((l) => l.journeyId)).toEqual([
      "R-UP-0800",
      "S-UP-0840",
    ]);
    expect(j1!.legs[1]!.waitMinBefore).toBe(20);
    expect(j1!.beAtStopBy).toBe(at("08:00") - BUFFER_MS);
    expect(j1!.arriveBy).toBe(at("09:00") + BUFFER_MS);
    // 09:00 R reaches C 09:20 → S 09:40
    expect(j2!.legs.map((l) => l.journeyId)).toEqual([
      "R-UP-0900",
      "S-UP-0940",
    ]);
  });

  test("a late first bus that would miss the connection is re-planned onto the next one", () => {
    // rider waits at B; the 08:00 R bus left A late at 08:18 → reaches C ~08:38, too late for 08:40
    const late: TripState = {
      status: "active",
      lastSeq: 0,
      lastStopId: "A",
      anchorAt: at("08:18"),
      lastSeenAt: at("08:18"),
    };
    const r = plan(ctx("08:20"), "B", "F", (id) =>
      id === "R-UP-0800" ? late : undefined,
    );
    if (r.kind !== "ok") throw new Error(r.kind);
    const rows = r.options[0]!.journeys.map((x) =>
      x.legs.map((l) => l.journeyId).join("+"),
    );
    // the late 08:00 bus now only makes the 09:40 connection; so does the 09:00 bus,
    // with 40 min less waiting at C, so the pointless 08:00 row is dropped
    expect(rows).toEqual(["R-UP-0900+S-UP-0940"]);
  });

  test("the connection buffer is exactly 5 min: arriving 5 min before still connects", () => {
    // left A at 08:15 → reaches C 08:35 → the 08:40 S bus is catchable, a 5 min wait
    const tight: TripState = {
      status: "active",
      lastSeq: 0,
      lastStopId: "A",
      anchorAt: at("08:15"),
      lastSeenAt: at("08:15"),
    };
    expect(CONNECTION_BUFFER_MS).toBe(5 * 60_000);
    const r = plan(ctx("08:16"), "B", "F", (id) =>
      id === "R-UP-0800" ? tight : undefined,
    );
    if (r.kind !== "ok") throw new Error(r.kind);
    const j = r.options[0]!.journeys.find(
      (x) => x.legs[0]!.journeyId === "R-UP-0800",
    )!;
    expect(j.legs[1]!.journeyId).toBe("S-UP-0840");
    expect(j.legs[1]!.waitMinBefore).toBe(5);
  });

  test("no catchable connection left today: no_more_today", () => {
    const r = plan(ctx("09:45"), "A", "F", noTrips);
    expect(r.kind).toBe("no_more_today");
  });
});
