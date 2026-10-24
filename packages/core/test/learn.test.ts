/** @format */

import { describe, expect, test } from "bun:test";
import {
  emptyStat,
  learnFromAdvance,
  typicalFrom,
  updateStat,
} from "../src/learn";
import { expectedTimes } from "../src/predict";
import { ingestEvent } from "../src/resolve";
import { MIN, SERVICE_TZ } from "../src/time";
import type {
  PredictCtx,
  SegmentStat,
  StatBucket,
  StatsStore,
  TripState,
  TripStore,
} from "../src/types";
import { at, DATE, net } from "./fixture";

const stat = (typicalSec: number, samples: number) => ({
  ...emptyStat(typicalSec),
  samples,
});

function stores() {
  const trips = new Map<string, TripState>();
  const stats = new Map<string, SegmentStat>();
  const tripStore: TripStore = {
    get: (j, d) => trips.get(`${j}@${d}`),
    set: (j, d, t) => void trips.set(`${j}@${d}`, t),
  };
  const statsStore: StatsStore = {
    get: (s, b: StatBucket) => stats.get(`${s}:${b}`),
    set: (s, b: StatBucket, v) => void stats.set(`${s}:${b}`, v),
  };
  const ctx: PredictCtx = {
    net,
    typical: typicalFrom(statsStore),
    tz: SERVICE_TZ,
    now: at("07:00"),
  };
  return { ctx, tripStore, statsStore, stats };
}

/** Plays one journey on the fixture route (timetable 10 min per segment). */
function play(
  s: ReturnType<typeof stores>,
  bus: string,
  start: string,
  segMin: number[],
) {
  let t = at(start);
  ["A", "B", "C", "D"].forEach((stop, i) => {
    if (i > 0) t += segMin[i - 1]! * MIN;
    ingestEvent(
      s.ctx,
      s.tripStore,
      bus,
      { stopId: stop, occurredAt: t },
      s.statsStore,
    );
  });
}

describe("update rule", () => {
  test("the first real sample replaces the timetable prior", () => {
    expect(updateStat(undefined, 900, 600)).toEqual(stat(900, 1));
  });

  test("running mean for the first five, then recent trips weigh 20%", () => {
    let row: SegmentStat | undefined;
    for (const x of [900, 1000, 1100, 900, 1100]) row = updateStat(row, x, 600);
    expect(row!.typicalSec).toBeCloseTo(1000, 6);
    row = updateStat(row, 2000, 600);
    expect(row.typicalSec).toBeCloseTo(1000 + 0.2 * 1000, 6);
  });

  test("outliers are counted but ignored", () => {
    let row: SegmentStat | undefined;
    for (const x of [900, 900, 900]) row = updateStat(row, x, 600);
    const after = updateStat(row, 900 * 3.5, 600);
    expect(after).toEqual({
      ...row!,
      rejected: 1,
      pendingCount: 1,
      pendingMeanSec: 3150,
    });
    expect(after.typicalSec).toBe(900);
    // before 3 samples, the timetable prior is the reference
    expect(updateStat(undefined, 600 * 4, 600)).toMatchObject({
      samples: 0,
      rejected: 1,
    });
  });
});

describe("a permanent change becomes the new normal", () => {
  const settled = () => {
    let row: SegmentStat | undefined;
    for (const x of [900, 900, 900]) row = updateStat(row, x, 600);
    return row!;
  };

  test("3 outliers in a row on the same side shift the typical time", () => {
    let row = settled();
    row = updateStat(row, 3000, 600);
    row = updateStat(row, 3100, 600);
    expect(row).toMatchObject({
      typicalSec: 900,
      rejected: 2,
      pendingCount: 2,
    });
    row = updateStat(row, 3200, 600);
    expect(row).toMatchObject({
      typicalSec: 3100,
      samples: 1,
      pendingCount: 0,
    });
  });

  test("a normal sample in between resets the streak", () => {
    let row = settled();
    row = updateStat(row, 3000, 600);
    row = updateStat(row, 3100, 600);
    row = updateStat(row, 950, 600);
    row = updateStat(row, 3200, 600);
    expect(row).toMatchObject({ pendingCount: 1, rejected: 3 });
    expect(row.typicalSec).toBeLessThan(1000);
  });

  test("outliers on opposite sides are noise, not a trend", () => {
    let row = settled();
    for (const x of [3000, 100, 3000, 100]) row = updateStat(row, x, 600);
    expect(row).toMatchObject({
      pendingCount: 1,
      rejected: 4,
      typicalSec: 900,
    });
  });
});

describe("lookup fallbacks", () => {
  test("bucket row needs 3 samples, else the all row, else the prior", () => {
    const { statsStore } = stores();
    const typical = typicalFrom(statsStore);
    expect(typical("A>B", "am_peak", 600)).toBe(600);
    statsStore.set("A>B", "all", stat(800, 1));
    statsStore.set("A>B", "am_peak", stat(900, 2));
    expect(typical("A>B", "am_peak", 600)).toBe(800);
    statsStore.set("A>B", "am_peak", stat(900, 3));
    expect(typical("A>B", "am_peak", 600)).toBe(900);
  });
});

describe("skipped stops", () => {
  test("elapsed time is split in proportion to current typical times", () => {
    const s = stores();
    s.statsStore.set("A>B", "all", stat(600, 1));
    s.statsStore.set("B>C", "all", stat(1200, 1));
    const out = learnFromAdvance(s.ctx, s.statsStore, {
      journeyId: "R-UP-0800",
      fromSeq: 0,
      fromAt: at("08:00"),
      toSeq: 2,
      toAt: at("08:36"),
    });
    const sample = (seg: string) =>
      out.find((o) => o.segmentId === seg && o.bucket === "all")!.sampleSec;
    expect(sample("A>B")).toBeCloseTo(720, 6); // 36 min × 1/3
    expect(sample("B>C")).toBeCloseTo(1440, 6); // 36 min × 2/3
  });
});

describe("self-correction (prd: fresh journey starts near reality)", () => {
  test("timetable 15 min wrong: after one replayed journey, the next one's expected time is within 2 min of reality", () => {
    const s = stores();
    const nextJourney = net.journeys.get("R-UP-0900")!;
    const timetableD = expectedTimes(s.ctx, nextJourney, DATE)[3]!;
    expect(timetableD).toBe(at("09:30"));

    // reality: 15 min per segment instead of 10, with noise
    play(s, "BUS1", "08:00", [14.2, 15.9, 15.1]);

    const learnedD = expectedTimes(s.ctx, nextJourney, DATE)[3]!;
    const realityD = at("09:45");
    expect(Math.abs(learnedD - realityD)).toBeLessThanOrEqual(2 * MIN);
  });

  test("dwell at a stop counts toward the next segment, not the arrival", () => {
    const s = stores();
    ingestEvent(
      s.ctx,
      s.tripStore,
      "BUS1",
      { stopId: "A", occurredAt: at("08:00") },
      s.statsStore,
    );
    ingestEvent(
      s.ctx,
      s.tripStore,
      "BUS1",
      { stopId: "A", occurredAt: at("08:03") },
      s.statsStore,
    );
    ingestEvent(
      s.ctx,
      s.tripStore,
      "BUS1",
      { stopId: "B", occurredAt: at("08:12") },
      s.statsStore,
    );
    expect(s.statsStore.get("A>B", "all")!.typicalSec).toBe(12 * 60);
  });
});
