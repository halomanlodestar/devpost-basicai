/** @format */

import type { LastSeen } from "./plan";

export interface LineInput {
  routeId: string;
  /** the rider's bus on this line: its time is shown at every stop */
  journeyId?: string;
}

/** A bus currently on the line, between stop `afterSeq` and the next. */
export interface LineBus {
  journeyId: string;
  afterSeq: number;
  lateMin: number;
  lastSeen: LastSeen;
}

export interface LineStop {
  stopId: string;
  name: string;
  seq: number;
  /** the rider's bus at this stop, when a journey was given and hasn't passed it */
  est?: number;
}

export interface LineView {
  routeId: string;
  routeName: string;
  stops: LineStop[];
  buses: LineBus[];
  journeyId?: string;
}
