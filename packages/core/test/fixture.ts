/** @format */

import { buildNetwork, pairKey } from "../src/network";
import type { NetworkData } from "../src/types";
import { dayStart, MIN } from "../src/time";

// A → B → C → D on route R (timetable 0/10/20/30), plus its reverse.
export const DATE = "2026-10-24";
export const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return dayStart(DATE) + (h * 60 + m) * MIN;
};

const stops = ["A", "B", "C", "D"].map((id) => ({ id, name: `Stop ${id}` }));
const seq = (ids: string[], step: number) =>
  ids.map((stopId, i) => ({ stopId, seq: i, offsetMin: i * step }));
const segs = (ids: string[]) =>
  ids.slice(1).map((to, i) => ({
    id: pairKey(ids[i]!, to),
    fromStopId: ids[i]!,
    toStopId: to,
  }));

export const data: NetworkData = {
  stops,
  routes: [
    {
      id: "R-UP",
      name: "R · A → D",
      reverseOfId: null,
      stops: seq(["A", "B", "C", "D"], 10),
    },
    {
      id: "R-DN",
      name: "R · D → A",
      reverseOfId: "R-UP",
      stops: seq(["D", "C", "B", "A"], 10),
    },
  ],
  journeys: [
    { id: "R-UP-0800", routeId: "R-UP", busId: "BUS1", departureMin: 8 * 60 },
    { id: "R-UP-0900", routeId: "R-UP", busId: "BUS2", departureMin: 9 * 60 },
    { id: "R-DN-0900", routeId: "R-DN", busId: "BUS1", departureMin: 9 * 60 },
  ],
  segments: [...segs(["A", "B", "C", "D"]), ...segs(["D", "C", "B", "A"])],
};

export const net = buildNetwork(data);
