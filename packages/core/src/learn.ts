/** @format */

// Learning stop-to-stop times from ticket history (spec > Learning).
// The first real sample replaces the timetable prior outright; then a running
// mean that becomes a recency-weighted average (α = max(1/n, 0.2)).

import { segmentInto } from "./network";
import { bucketAt } from "./time";
import type {
  Advance,
  Bucket,
  LearnedSample,
  PredictCtx,
  SegmentStat,
  StatBucket,
  StatsStore,
  Typical,
} from "./types";

/** A bucket row is trusted once it has this many samples. */
export const BUCKET_MIN_SAMPLES = 3;
/** Samples outside [LOW×, HIGH×] the reference are outliers. */
export const OUTLIER_LOW = 0.33;
export const OUTLIER_HIGH = 3;
export const ALPHA_FLOOR = 0.2;
/** This many outliers in a row on the same side become the new normal. */
export const SHIFT_AFTER = 3;

/** bucket row (≥3 samples) → `all` row (≥1) → timetable prior. */
export function typicalFrom(stats: StatsStore): Typical {
  return (segmentId: string, bucket: Bucket, priorSec: number) => {
    const b = stats.get(segmentId, bucket);
    if (b && b.samples >= BUCKET_MIN_SAMPLES) return b.typicalSec;
    const all = stats.get(segmentId, "all");
    if (all && all.samples >= 1) return all.typicalSec;
    return priorSec;
  };
}

/**
 * One sample into one row: outlier check, then the update rule.
 * A single outlier (breakdown, clock glitch) is ignored. But SHIFT_AFTER outliers
 * in a row on the same side mean the road itself changed (a closure, a diversion):
 * their mean becomes the new normal instead of being rejected forever.
 */
export function updateStat(
  row: SegmentStat | undefined,
  sampleSec: number,
  priorSec: number,
): SegmentStat {
  const cur = row ?? emptyStat(priorSec);
  const ref = cur.samples >= BUCKET_MIN_SAMPLES ? cur.typicalSec : priorSec;
  const tooFast = sampleSec < OUTLIER_LOW * ref;
  const tooSlow = sampleSec > OUTLIER_HIGH * ref;

  if (tooFast || tooSlow) {
    const sameSide =
      cur.pendingCount > 0 && cur.pendingMeanSec > ref === tooSlow;
    const count = sameSide ? cur.pendingCount + 1 : 1;
    const mean = sameSide
      ? cur.pendingMeanSec + (sampleSec - cur.pendingMeanSec) / count
      : sampleSec;

    if (count >= SHIFT_AFTER)
      return { ...emptyStat(mean), samples: 1, rejected: cur.rejected };

    return {
      ...cur,
      rejected: cur.rejected + 1,
      pendingCount: count,
      pendingMeanSec: mean,
    };
  }

  const n = cur.samples + 1;
  const alpha = Math.max(1 / n, ALPHA_FLOOR); // n = 1 → α = 1: the first sample replaces the prior

  return {
    typicalSec: cur.typicalSec + alpha * (sampleSec - cur.typicalSec),
    samples: n,
    rejected: cur.rejected,
    pendingCount: 0,
    pendingMeanSec: 0,
  };
}

export const emptyStat = (typicalSec: number): SegmentStat => ({
  typicalSec,
  samples: 0,
  rejected: 0,
  pendingCount: 0,
  pendingMeanSec: 0,
});

/**
 * Turns one trip advance into per-segment samples. Tickets aren't cut at every
 * stop, so when it skipped stops the elapsed time is split across those
 * segments in proportion to their current typical times. Dwell at the starting
 * stop belongs to the following segment. Each sample's bucket is the time the
 * bus entered that segment.
 */
export function learnFromAdvance(
  ctx: PredictCtx,
  stats: StatsStore,
  adv: Advance,
): LearnedSample[] {
  const journey = ctx.net.journeys.get(adv.journeyId)!;
  const route = ctx.net.routes.get(journey.routeId)!;
  const elapsed = (adv.toAt - adv.fromAt) / 1000;
  if (elapsed <= 0 || adv.toSeq <= adv.fromSeq) return [];

  const segs = [];
  for (let k = adv.fromSeq + 1; k <= adv.toSeq; k++) {
    const priorSec =
      (route.stops[k]!.offsetMin - route.stops[k - 1]!.offsetMin) * 60;
    segs.push({ segment: segmentInto(ctx.net, route, k), priorSec });
  }
  const typical = typicalFrom(stats);
  const weights = segs.map((s) =>
    typical(s.segment.id, bucketAt(adv.fromAt, ctx.tz), s.priorSec),
  );
  const total = weights.reduce((a, b) => a + b, 0);

  const out: LearnedSample[] = [];
  let enteredAt = adv.fromAt;
  segs.forEach(({ segment, priorSec }, i) => {
    const sampleSec = (elapsed * weights[i]!) / total;
    for (const bucket of [bucketAt(enteredAt, ctx.tz), "all"] as const) {
      const before = stats.get(segment.id, bucket);
      const after = updateStat(before, sampleSec, priorSec);
      stats.set(segment.id, bucket, after);
      out.push({
        segmentId: segment.id,
        bucket,
        sampleSec,
        accepted: after.samples > (before?.samples ?? 0),
      });
    }
    enteredAt += sampleSec * 1000;
  });
  return out;
}
