/** @format */

import { describe, expect, test } from "bun:test";
import { decideAlerts } from "../src/alerts";
import { MIN } from "../src/time";

const by = 1_000_000_000_000; // "be at your stop by"
const base = {
  beAtStopBy: by,
  lateMin: 0,
  sentThresholds: [],
  lastLateBucket: 0,
};

describe("alert decisions", () => {
  test("an hour out: all three countdowns, at 45/30/15 min before be-there-by", () => {
    const d = decideAlerts({ ...base, now: by - 60 * MIN });
    expect(d.countdowns).toEqual([
      { minutes: 45, fireAt: by - 45 * MIN },
      { minutes: 30, fireAt: by - 30 * MIN },
      { minutes: 15, fireAt: by - 15 * MIN },
    ]);
    expect(d.delay).toBeNull();
  });

  test("subscribing 20 min out sends only the marks still ahead", () => {
    expect(
      decideAlerts({ ...base, now: by - 20 * MIN }).countdowns.map(
        (c) => c.minutes,
      ),
    ).toEqual([15]);
  });

  test("a mark already sent is never sent again", () => {
    const d = decideAlerts({
      ...base,
      now: by - 60 * MIN,
      sentThresholds: [45],
    });
    expect(d.countdowns.map((c) => c.minutes)).toEqual([30, 15]);
  });

  test("a bus that slips moves the marks with it", () => {
    const later = by + 12 * MIN;
    const d = decideAlerts({
      ...base,
      beAtStopBy: later,
      now: by - 40 * MIN,
      sentThresholds: [45],
    });
    expect(d.countdowns[0]).toEqual({ minutes: 30, fireAt: later - 30 * MIN });
  });

  test("delay pushes at each new 10-min step, once", () => {
    expect(
      decideAlerts({ ...base, now: by - 60 * MIN, lateMin: 9 }).delay,
    ).toBeNull();
    expect(
      decideAlerts({ ...base, now: by - 60 * MIN, lateMin: 12 }).delay,
    ).toEqual({ lateMin: 12, bucket: 1 });
    expect(
      decideAlerts({
        ...base,
        now: by - 60 * MIN,
        lateMin: 17,
        lastLateBucket: 1,
      }).delay,
    ).toBeNull();
    expect(
      decideAlerts({
        ...base,
        now: by - 60 * MIN,
        lateMin: 21,
        lastLateBucket: 1,
      }).delay,
    ).toEqual({ lateMin: 21, bucket: 2 });
  });

  test("early buses never send a delay push", () => {
    expect(
      decideAlerts({ ...base, now: by - 60 * MIN, lateMin: -14 }).delay,
    ).toBeNull();
  });
});
