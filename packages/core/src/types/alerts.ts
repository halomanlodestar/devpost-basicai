/**
 * A countdown push due at `fireAt`: "{minutes} min to your stop".
 *
 * @format
 */

export interface CountdownDue {
  minutes: number;
  fireAt: number;
}

/** What an alert should do after the latest prediction. */
export interface AlertDecision {
  /** countdown marks still ahead, not yet sent */
  countdowns: CountdownDue[];
  /** send "running late" now: lateness crossed a new 10-min step */
  delay: DelayDue | null;
}

export interface DelayDue {
  lateMin: number;
  /** floor(lateMin / 10): 1 = 10+ min late, 2 = 20+ … */
  bucket: number;
}

export interface AlertInput {
  beAtStopBy: number;
  lateMin: number;
  now: number;
  sentThresholds: number[];
  lastLateBucket: number;
}
