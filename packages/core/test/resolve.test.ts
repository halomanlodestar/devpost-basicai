/** @format */

import { describe, expect, test } from "bun:test";
import { estimatedTimes, expectedTimes, timetableOnly } from "../src/predict";
import { ingestEvent } from "../src/resolve";
import { sign, verifySignature } from "../src/sign";
import { SERVICE_TZ } from "../src/time";
import type { PredictCtx, StopEvent, TripState, TripStore } from "../src/types";
import { at, DATE, net } from "./fixture";

const ctx: PredictCtx = {
  net,
  typical: timetableOnly,
  tz: SERVICE_TZ,
  now: at("12:00"),
};

function memoryStore(): TripStore & { all: Map<string, TripState> } {
  const all = new Map<string, TripState>();
  return {
    all,
    get: (j, d) => all.get(`${j}@${d}`),
    set: (j, d, t) => void all.set(`${j}@${d}`, t),
  };
}

const ev = (stopId: string, hhmm: string): StopEvent => ({
  stopId,
  occurredAt: at(hhmm),
});

describe("trip resolution", () => {
  test("first event starts the journey whose expected time is closest", () => {
    const store = memoryStore();
    const r = ingestEvent(ctx, store, "BUS1", ev("B", "08:14"));
    expect(r.resolution).toEqual({
      kind: "start",
      journeyId: "R-UP-0800",
      seq: 1,
      completes: undefined,
    });
    expect(store.get("R-UP-0800", DATE)).toMatchObject({
      status: "active",
      lastSeq: 1,
      anchorAt: at("08:14"),
    });
  });

  test("later stops continue the active trip; repeat tickets only bump last seen", () => {
    const store = memoryStore();
    ingestEvent(ctx, store, "BUS1", ev("A", "08:02"));
    ingestEvent(ctx, store, "BUS1", ev("A", "08:04"));
    expect(store.get("R-UP-0800", DATE)).toMatchObject({
      lastSeq: 0,
      anchorAt: at("08:02"),
      lastSeenAt: at("08:04"),
    });
    const r = ingestEvent(ctx, store, "BUS1", ev("C", "08:25"));
    expect(r.resolution).toEqual({
      kind: "continue",
      journeyId: "R-UP-0800",
      seq: 2,
    });
    expect(store.get("R-UP-0800", DATE)).toMatchObject({
      lastSeq: 2,
      lastStopId: "C",
      anchorAt: at("08:25"),
    });
  });

  test("reaching the last stop completes; the next ticket there starts the return trip", () => {
    const store = memoryStore();
    ingestEvent(ctx, store, "BUS1", ev("A", "08:00"));
    ingestEvent(ctx, store, "BUS1", ev("D", "08:40"));
    expect(store.get("R-UP-0800", DATE)?.status).toBe("completed");
    const r = ingestEvent(ctx, store, "BUS1", ev("D", "08:58"));
    expect(r.resolution).toMatchObject({
      kind: "start",
      journeyId: "R-DN-0900",
      seq: 0,
    });
  });

  test("an event far from any journey is unassigned and changes nothing", () => {
    const store = memoryStore();
    const r = ingestEvent(ctx, store, "BUS1", ev("B", "15:00"));
    expect(r.resolution.kind).toBe("unassigned");
    expect(store.all.size).toBe(0);
  });

  test("an out-of-order event older than the anchor is stale and moves nothing", () => {
    const store = memoryStore();
    ingestEvent(ctx, store, "BUS1", ev("C", "08:25"));
    const before = store.get("R-UP-0800", DATE);
    const r = ingestEvent(ctx, store, "BUS1", ev("B", "08:12"));
    expect(r.resolution.kind).toBe("stale");
    expect(store.get("R-UP-0800", DATE)).toEqual(before!);
  });

  test("a withheld-then-flushed batch gives the same state as live delivery", () => {
    const events = [
      ev("A", "08:03"),
      ev("B", "08:16"),
      ev("B", "08:17"),
      ev("C", "08:29"),
      ev("D", "08:41"),
    ];
    const live = memoryStore();
    for (const e of events) ingestEvent(ctx, live, "BUS1", e);

    const flushed = memoryStore();
    ingestEvent(ctx, flushed, "BUS1", events[0]!);
    // dead zone: the rest arrive later as one batch, in device order after sorting
    const batch = [...events.slice(1)]
      .reverse()
      .sort((a, b) => a.occurredAt - b.occurredAt);
    for (const e of batch) ingestEvent(ctx, flushed, "BUS1", e);

    expect(flushed.all).toEqual(live.all);
  });
});

describe("live prediction from an active trip", () => {
  test("estimates chain from the anchor; late shows against expected", () => {
    const store = memoryStore();
    ingestEvent(ctx, store, "BUS1", ev("B", "08:22")); // 12 min behind the timetable
    const j = net.journeys.get("R-UP-0800")!;
    const now = { ...ctx, now: at("08:23") };
    const expected = expectedTimes(now, j, DATE);
    const est = estimatedTimes(now, j, expected, store.get(j.id, DATE));
    expect(est[2]).toBe(at("08:32"));
    expect(Math.round((est[2]! - expected[2]!) / 60_000)).toBe(12);
  });
});

describe("signatures", () => {
  const secret = "s3cret";
  const body = '{"events":[]}';
  const ts = "1792800000";
  test("a correctly signed request verifies", () => {
    expect(
      verifySignature(secret, ts, body, sign(secret, ts, body), 1792800010),
    ).toBe(true);
  });
  test("wrong key, tampered body or stale timestamp is rejected", () => {
    expect(
      verifySignature(secret, ts, body, sign("other", ts, body), 1792800010),
    ).toBe(false);
    expect(
      verifySignature(
        secret,
        ts,
        body + " ",
        sign(secret, ts, body),
        1792800010,
      ),
    ).toBe(false);
    expect(
      verifySignature(
        secret,
        ts,
        body,
        sign(secret, ts, body),
        1792800000 + 301,
      ),
    ).toBe(false);
  });
});
