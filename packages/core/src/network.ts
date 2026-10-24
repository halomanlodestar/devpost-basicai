/** @format */

// The network as the API holds it in memory: routes are ordered stop lists,
// segments are the directed stop-to-stop graph derived from them.

import type { Network, NetworkData, Route, Segment } from "./types";

export const pairKey = (from: string, to: string) => `${from}>${to}`;

export function buildNetwork(data: NetworkData): Network {
  const net: Network = {
    stops: new Map(data.stops.map((s) => [s.id, s])),
    routes: new Map(),
    journeys: new Map(data.journeys.map((j) => [j.id, j])),
    stopRoutes: new Map(),
    seqOf: new Map(),
    journeysByRoute: new Map(),
    journeysByBus: new Map(),
    segmentRoutes: new Map(),
    segmentByPair: new Map(
      data.segments.map((s) => [pairKey(s.fromStopId, s.toStopId), s]),
    ),
  };

  for (const route of data.routes) {
    const stops = [...route.stops].sort((a, b) => a.seq - b.seq);
    const seqs = new Map<string, number>();
    stops.forEach((rs, i) => {
      if (rs.seq !== i)
        throw new Error(`route ${route.id}: seq must be contiguous from 0`);
      if (!net.stops.has(rs.stopId))
        throw new Error(`route ${route.id}: unknown stop ${rs.stopId}`);
      if (seqs.has(rs.stopId))
        throw new Error(`route ${route.id}: stop ${rs.stopId} appears twice`);
      if (
        i > 0 &&
        !net.segmentByPair.has(pairKey(stops[i - 1]!.stopId, rs.stopId))
      )
        throw new Error(
          `route ${route.id}: missing segment ${stops[i - 1]!.stopId} → ${rs.stopId}`,
        );
      if (i > 0) {
        const seg = net.segmentByPair.get(
          pairKey(stops[i - 1]!.stopId, rs.stopId),
        )!;
        const routes = net.segmentRoutes.get(seg.id) ?? new Set<string>();
        routes.add(route.id);
        net.segmentRoutes.set(seg.id, routes);
      }
      seqs.set(rs.stopId, i);
      const list = net.stopRoutes.get(rs.stopId) ?? [];
      list.push({ routeId: route.id, seq: i });
      net.stopRoutes.set(rs.stopId, list);
    });
    net.routes.set(route.id, { ...route, stops });
    net.seqOf.set(route.id, seqs);
  }

  for (const j of [...data.journeys].sort(
    (a, b) => a.departureMin - b.departureMin,
  )) {
    if (!net.routes.has(j.routeId))
      throw new Error(`journey ${j.id}: unknown route ${j.routeId}`);
    push(net.journeysByRoute, j.routeId, j);
    push(net.journeysByBus, j.busId, j);
  }
  return net;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** The segment entering stop `seq` of a route (seq ≥ 1). */
export function segmentInto(net: Network, route: Route, seq: number): Segment {
  return net.segmentByPair.get(
    pairKey(route.stops[seq - 1]!.stopId, route.stops[seq]!.stopId),
  )!;
}
