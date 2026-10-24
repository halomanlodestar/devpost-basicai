/** @format */

import type { Journey } from "./network";
import type { TripState } from "./predict";

/** A ticket event as the server sees it: stop and time, nothing about the trip. */
export interface StopEvent {
  stopId: string;
  occurredAt: number;
}

/** The bus's active trip has this stop ahead of it. */
export interface ResolvedContinue {
  kind: "continue";
  journeyId: string;
  seq: number;
}

/** More tickets at the stop the bus was last seen at. */
export interface ResolvedSameStop {
  kind: "same_stop";
  journeyId: string;
}

/** Starts (or activates) a trip; `completes` is the bus's previous active journey. */
export interface ResolvedStart {
  kind: "start";
  journeyId: string;
  seq: number;
  completes?: string;
}

/** Older than the active trip's anchor: stored against it, moves nothing. */
export interface ResolvedStale {
  kind: "stale";
  journeyId: string;
}

export interface ResolvedUnassigned {
  kind: "unassigned";
}

/** Where an event lands (spec > Trip Resolution). */
export type Resolution =
  | ResolvedContinue
  | ResolvedSameStop
  | ResolvedStart
  | ResolvedStale
  | ResolvedUnassigned;

/** Reads and writes trip state during a batch. */
export interface TripStore {
  get(journeyId: string, serviceDate: string): TripState | undefined;
  set(journeyId: string, serviceDate: string, trip: TripState): void;
}

export interface StartCandidate {
  journey: Journey;
  seq: number;
  /** |expected time at the stop − event time| */
  gap: number;
}

export interface IngestResult {
  resolution: Resolution;
  /** journeys whose trip state changed */
  touched: string[];
}

/** One ticket event on the wire (`POST /ingest/events`). */
export interface WireEvent {
  idempotencyKey: string;
  stopId: string;
  /** ISO-8601, device clock */
  occurredAt: string;
}

export interface IngestBody {
  events: WireEvent[];
}

export interface IngestResponse {
  accepted: number;
  duplicates: number;
  unassigned: number;
}
