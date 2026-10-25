/** @format */

import { describe, expect, test } from "bun:test";
import { lineView } from "../src/line";
import { timetableOnly } from "../src/predict";
import { SERVICE_TZ } from "../src/time";
import type { PredictCtx, TripState } from "../src/types";
import { at, net } from "./fixture";

const ctx: PredictCtx = {
  net,
  typical: timetableOnly,
  tz: SERVICE_TZ,
  now: at("08:16"),
};
const live: TripState = {
  status: "active",
  lastSeq: 1,
  lastStopId: "B",
  anchorAt: at("08:14"),
  lastSeenAt: at("08:15"),
};
const trips = (id: string) => (id === "R-UP-0800" ? live : undefined);

describe("line view", () => {
  test("every stop of the route, end to end", () => {
    const v = lineView(ctx, "R-UP", trips)!;
    expect(v.stops.map((s) => s.stopId)).toEqual(["A", "B", "C", "D"]);
  });

  test("live buses sit after their last-seen stop, with lateness", () => {
    const v = lineView(ctx, "R-UP", trips)!;
    expect(v.buses).toEqual([
      {
        journeyId: "R-UP-0800",
        afterSeq: 1,
        lateMin: 4,
        lastSeen: { stopName: "Stop B", at: at("08:15") },
      },
    ]);
  });

  test("with the rider's bus: its time at every stop it hasn't passed", () => {
    const v = lineView(ctx, "R-UP", trips, "R-UP-0800")!;
    expect(v.stops.map((s) => s.est)).toEqual([
      undefined,
      undefined,
      at("08:24"),
      at("08:34"),
    ]);
    const notStarted = lineView(ctx, "R-UP", trips, "R-UP-0900")!;
    expect(notStarted.stops[0]!.est).toBe(at("09:00"));
  });

  test("unknown route: null", () => {
    expect(lineView(ctx, "NOPE", trips)).toBeNull();
  });
});
