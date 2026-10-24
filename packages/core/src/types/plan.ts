/** @format */

import type { TripState } from "./predict";

export interface PatternLeg {
  routeId: string;
  boardSeq: number;
  alightSeq: number;
}

export interface Pattern {
  id: string;
  legs: PatternLeg[];
  changeStopIds: string[];
}

export interface TripLookup {
  (journeyId: string, serviceDate: string): TripState | undefined;
}

export interface PlanInput {
  from: string;
  to: string;
}

/** One stop on a leg's timeline, with the bus's predicted (or, for the last-seen stop, actual) time. */
export interface LegStop {
  stopId: string;
  name: string;
  est: number;
}

/** All times are epoch ms. */
export interface Leg {
  routeId: string;
  routeName: string;
  journeyId: string;
  boardStopId: string;
  boardStopName: string;
  boardEst: number;
  alightStopId: string;
  alightStopName: string;
  alightEst: number;
  /** predicted wait at the change stop before this leg (legs after the first) */
  waitMinBefore?: number;
  /** from the bus's last-seen stop (if it's behind the board stop) or the board stop, to the alight stop */
  stops: LegStop[];
}

export interface LastSeen {
  stopName: string;
  at: number;
}

export interface JourneyView {
  /** stable across recomputes: leg journey ids + service date */
  id: string;
  serviceDate: string;
  legs: Leg[];
  /** estimated at X − 5 min */
  beAtStopBy: number;
  /** estimated at Y + 5 min */
  arriveBy: number;
  expectedX: number;
  lateMin: number;
  status: "not_started" | "active";
  lastSeen?: LastSeen;
}

export interface Option {
  id: string;
  routes: string[];
  changes: number;
  changeStops: string[];
  next: JourneyView;
  journeys: JourneyView[];
}

export interface PlanOk {
  kind: "ok";
  generatedAt: number;
  options: Option[];
}

export interface PlanNoRoute {
  kind: "no_route";
  reverseServed: boolean;
}

export interface PlanNoMoreToday {
  kind: "no_more_today";
  tomorrowFirst?: number;
}

export type PlanResult = PlanOk | PlanNoRoute | PlanNoMoreToday;
