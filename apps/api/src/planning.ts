/** @format */

import { findPatterns, lineView, plan, typicalFrom } from "@app/core";
import type { LineInput, LineView, PlanResult } from "@app/core/types";
import { statsOf, tripKey } from "./state";
import type { State } from "./types";

/** X → Y right now, from memory only. */
export function computePlan(
  state: State,
  tz: string,
  from: string,
  to: string,
): PlanResult {
  return plan(
    {
      net: state.net,
      typical: typicalFrom(statsOf(state)),
      tz,
      now: Date.now(),
    },
    from,
    to,
    (j, d) => state.trips.get(tripKey(j, d)),
  );
}

/** Every route any option for X → Y rides on: an update to one of them can change the result. */
export function routesFor(state: State, from: string, to: string): Set<string> {
  return new Set(
    findPatterns(state.net, from, to).flatMap((p) =>
      p.legs.map((l) => l.routeId),
    ),
  );
}

/** One line end to end, live buses on it, the rider's bus's times; from memory only. */
export function computeLine(
  state: State,
  tz: string,
  input: LineInput,
): LineView | null {
  return lineView(
    {
      net: state.net,
      typical: typicalFrom(statsOf(state)),
      tz,
      now: Date.now(),
    },
    input.routeId,
    (j, d) => state.trips.get(tripKey(j, d)),
    input.journeyId,
  );
}
