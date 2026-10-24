/** @format */

import { describe, expect, test } from "bun:test";
import { typicalFrom } from "../src/learn";
import { expectedTimes } from "../src/predict";
import { ingestEvent } from "../src/resolve";
import { addDays, MIN, SERVICE_TZ } from "../src/time";
import type {
  PredictCtx,
  SegmentStat,
  StatsStore,
  TripState,
  TripStore,
} from "../src/types";
import { at, DATE, net } from "./fixture";

// 25 days of the 08:00 journey on A → B → C → D. Timetable: 10 min per segment.
// Reality: ~15 min per segment. Each day the bus reports at every stop.

const DAY = 24 * 60 * MIN;
const SEGMENTS = ["A>B", "B>C", "C>D"];
const TRIPS = 25;

/** Seeded PRNG so every run sees the same "reality". */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function world() {
  const trips = new Map<string, TripState>();
  const stats = new Map<string, SegmentStat>();
  const tripStore: TripStore = {
    get: (j, d) => trips.get(`${j}@${d}`),
    set: (j, d, t) => void trips.set(`${j}@${d}`, t),
  };
  const statsStore: StatsStore = {
    get: (s, b) => stats.get(`${s}:${b}`),
    set: (s, b, v) => void stats.set(`${s}:${b}`, v),
  };
  const ctx: PredictCtx = {
    net,
    typical: typicalFrom(statsStore),
    tz: SERVICE_TZ,
    now: at("07:00"),
  };
  return { ctx, tripStore, statsStore };
}

/** Plays day `n`: the 08:00 bus takes `segMin[i]` minutes on segment i. */
function playDay(w: ReturnType<typeof world>, n: number, segMin: number[]) {
  let t = at("08:00") + n * DAY;
  ["A", "B", "C", "D"].forEach((stop, i) => {
    if (i > 0) t += segMin[i - 1]! * MIN;
    ingestEvent(
      w.ctx,
      w.tripStore,
      "BUS1",
      { stopId: stop, occurredAt: t },
      w.statsStore,
    );
  });
}

/** Learned minutes per segment, as the next day's journey would use them (am-peak lookup). */
function learned(w: ReturnType<typeof world>, n: number) {
  const j = net.journeys.get("R-UP-0800")!;
  const exp = expectedTimes(w.ctx, j, addDays(DATE, n));
  return [1, 2, 3].map((k) => (exp[k]! - exp[k - 1]!) / MIN);
}

const row = (n: number | string, segs: number[], note = "") =>
  `${String(n).padStart(5)} │ ${segs.map((m) => m.toFixed(1).padStart(5)).join(" ")} │ ${segs
    .reduce((a, b) => a + b, 0)
    .toFixed(1)
    .padStart(5)} ${note}`;

const header = (title: string) =>
  console.log(
    `\n${title}\n  day │   A>B   B>C   C>D │ total\n${"─".repeat(40)}`,
  );

describe("long run: 25 normal days", () => {
  test("converges from the timetable to reality and stays there", () => {
    const w = world();
    const noise = rng(42);
    header("normal days: reality 15 ± 10% per segment (timetable 10)");
    console.log(row("start", learned(w, 0), "← timetable"));

    const actual: number[][] = [];
    for (let n = 0; n < TRIPS; n++) {
      const segs = SEGMENTS.map(() => 15 * (1 + (noise() * 2 - 1) * 0.1));
      actual.push(segs);
      playDay(w, n, segs);
      if (n < 6 || n % 5 === 4) console.log(row(n + 1, learned(w, n + 1)));
    }

    const final = learned(w, TRIPS);
    const realMean = SEGMENTS.map(
      (_, i) => actual.reduce((a, s) => a + s[i]!, 0) / TRIPS,
    );
    console.log(row("real", realMean, "← mean of what buses actually did"));

    // each segment within 1 min of the true mean, the whole trip within 2
    final.forEach((m, i) => expect(Math.abs(m - realMean[i]!)).toBeLessThan(1));
    expect(Math.abs(final.reduce((a, b) => a + b) - 45)).toBeLessThan(2);
    // nothing in a ±10% world is an outlier
    for (const seg of SEGMENTS)
      expect(w.statsStore.get(seg, "all")!.rejected).toBe(0);
  });
});

describe("long run: 25 days with usual delays and a few outliers", () => {
  test("real congestion moves the average; breakdowns and glitches don't", () => {
    const w = world();
    const noise = rng(7);
    // day → [segment index, minutes, kind]
    const events = new Map<number, [number, number, string][]>([
      [6, [[1, 22, "congestion"]]],
      [9, [[1, 60, "OUTLIER breakdown (4×)"]]],
      [
        11,
        [
          [0, 24, "congestion"],
          [2, 21, "congestion"],
        ],
      ],
      [14, [[2, 3, "OUTLIER clock glitch (0.2×)"]]],
      [17, [[1, 25, "congestion"]]],
      [19, [[0, 55, "OUTLIER breakdown (3.7×)"]]],
      [22, [[2, 23, "congestion"]]],
    ]);
    header("realistic days: 15 ± 10%, plus congestion and outliers");
    console.log(row("start", learned(w, 0), "← timetable"));

    const accepted: number[][] = [[], [], []];
    let outliers = 0;
    for (let n = 0; n < TRIPS; n++) {
      const segs = SEGMENTS.map(() => 15 * (1 + (noise() * 2 - 1) * 0.1));
      const notes: string[] = [];
      for (const [i, min, kind] of events.get(n) ?? []) {
        segs[i] = min;
        notes.push(`${SEGMENTS[i]} ${min} min ${kind}`);
        if (kind.startsWith("OUTLIER")) outliers++;
      }
      segs.forEach((m, i) => {
        if (
          !(events.get(n) ?? []).some(
            ([s, , k]) => s === i && k.startsWith("OUTLIER"),
          )
        )
          accepted[i]!.push(m);
      });
      playDay(w, n, segs);
      console.log(row(n + 1, learned(w, n + 1), notes.join("; ")));
    }

    const final = learned(w, TRIPS);
    const rejected = SEGMENTS.reduce(
      (a, s) => a + w.statsStore.get(s, "all")!.rejected,
      0,
    );
    console.log(
      `\nrejected samples: ${rejected} (outliers injected: ${outliers})`,
    );

    // every injected outlier was rejected, nothing else was
    expect(rejected).toBe(outliers);
    // a 60-min breakdown didn't drag B>C up: it stays near the normal-plus-congestion level
    expect(final[1]!).toBeLessThan(18);
    // congestion is real and nudges the average above the 15-min base, but only a little
    const meanAccepted = accepted.map(
      (xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
    );
    final.forEach((m, i) => {
      expect(m).toBeGreaterThan(14);
      expect(Math.abs(m - meanAccepted[i]!)).toBeLessThan(2.5);
    });
  });
});

describe("long run: a road closes for good", () => {
  test("a one-off breakdown is ignored; a permanent 3.3× slowdown is adopted after 3 trips", () => {
    const w = world();
    const noise = rng(99);
    header("closure: B>C goes from ~15 to ~50 min from day 11 onward");
    console.log(row("start", learned(w, 0), "← timetable"));

    let bcOnDay12 = 0;
    for (let n = 0; n < TRIPS; n++) {
      const segs = SEGMENTS.map(() => 15 * (1 + (noise() * 2 - 1) * 0.1));
      const notes: string[] = [];
      if (n === 4) {
        segs[0] = 55;
        notes.push("A>B 55 min one-off breakdown");
      }
      if (n >= 10) {
        segs[1] = 50 * (1 + (noise() * 2 - 1) * 0.1);
        if (n === 10) notes.push("road closed: B>C now ~50 min");
      }
      playDay(w, n, segs);
      const now = learned(w, n + 1);
      if (n === 12) bcOnDay12 = now[1]!;
      if (n < 6 || (n >= 9 && n <= 14) || n % 5 === 4)
        console.log(row(n + 1, now, notes.join("; ")));
    }

    const final = learned(w, TRIPS);
    // the one-off breakdown didn't move A>B
    expect(final[0]!).toBeLessThan(17);
    // after the 3rd slow trip in a row, B>C is the new normal
    expect(bcOnDay12).toBeGreaterThan(45);
    expect(Math.abs(final[1]! - 50)).toBeLessThan(3);
  });
});
