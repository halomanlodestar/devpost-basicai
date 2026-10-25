/** @format */

// When a journey's alerts should fire (spec > Alerts and Notifications), from the
// latest prediction. Pure: the API turns the answer into timers and pushes.

import { MIN } from "./time";
import type { AlertDecision, AlertInput } from "./types";

/** Countdown pushes this many minutes before "be at your stop by". */
export const COUNTDOWN_MIN = [45, 30, 15] as const;
/** A delay push each time lateness crosses a multiple of this. */
export const DELAY_STEP_MIN = 10;

export function decideAlerts(a: AlertInput): AlertDecision {
  const countdowns = COUNTDOWN_MIN.filter((m) => !a.sentThresholds.includes(m))
    .map((minutes) => ({ minutes, fireAt: a.beAtStopBy - minutes * MIN }))
    // only the marks still ahead: subscribing 20 min out sends just the 15
    .filter((c) => c.fireAt > a.now);

  const bucket = Math.floor(a.lateMin / DELAY_STEP_MIN);
  const delay =
    bucket >= 1 && bucket > a.lastLateBucket
      ? { lateMin: a.lateMin, bucket }
      : null;

  return { countdowns, delay };
}
