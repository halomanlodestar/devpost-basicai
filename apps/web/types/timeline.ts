/**
 * One stop on the journey timeline, flattened across every leg.
 *
 * @format
 */

export interface TimelineStop {
  kind: "bus" | "board" | "stop" | "change" | "end";
  stopId: string;
  name: string;
  /** clock on the left: the bus's time there, or "arrive by" at the end */
  at: number;
  /** the route this stop is ridden on (its color) */
  routeName: string;
  /** before the rider boards: the bus's way to them, drawn faded */
  beforeBoard: boolean;
  /** change rows: the next route and the wait for it */
  nextRouteName?: string;
  waitMin?: number;
}

/** The next bus leaving the change stop. */
export interface TimelineDepart {
  kind: "depart";
  stopId: string;
  at: number;
  routeName: string;
  beforeBoard: false;
}

export type TimelineRow = TimelineStop | TimelineDepart;
