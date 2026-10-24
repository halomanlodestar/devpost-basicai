/** @format */

import type { PrismaClient } from "../generated/prisma/client";

export type Db = PrismaClient;

/** [stop name, timetable minutes from departure] */
export type TimedStop = [name: string, offsetMin: number];

/** [from stop id, to stop id] */
export type StopPair = [fromStopId: string, toStopId: string];

export interface RouteDef {
  code: string;
  name: string;
  /** stops in the UP direction */
  stops: TimedStop[];
  /** first UP departure, minutes after midnight; one departure per hour per direction */
  firstDeparture: number;
}

export interface SeedRoute {
  id: string;
  name: string;
  reverseOfId: string | null;
  stops: TimedStop[];
}

export interface SeedBus {
  id: string;
  regNo: string;
}

export interface SeedJourney {
  id: string;
  routeId: string;
  busId: string;
  departureMin: number;
}
