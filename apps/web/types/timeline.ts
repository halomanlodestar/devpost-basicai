/**
 * One row of the journey timeline, flattened across every leg.
 *
 * @format
 */

export interface TimelineStop {
  kind: "bus" | "board" | "stop" | "change" | "end";
  stopId: string;
  name: string;
  /** clock shown on the left: bus arrival, or "arrive by" at the end */
  at: number;
}

/** The wait at a change stop before the next bus. */
export interface TimelineWait {
  kind: "wait";
  stopId: string;
  waitMin: number;
  /** next bus's route name and when it leaves the change stop */
  routeName: string;
  departs: number;
}

export type TimelineRow = TimelineStop | TimelineWait;
