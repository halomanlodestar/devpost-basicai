/** @format */

export interface Stop {
  id: string;
  name: string;
}

export interface RouteStop {
  stopId: string;
  seq: number;
  /** timetable minutes from departure */
  offsetMin: number;
}

/** One per direction; stops sorted by seq. */
export interface Route {
  id: string;
  name: string;
  reverseOfId: string | null;
  stops: RouteStop[];
}

export interface Journey {
  id: string;
  routeId: string;
  busId: string;
  /** minutes after midnight, service time zone */
  departureMin: number;
}

/** Directed stop-to-stop edge. */
export interface Segment {
  id: string;
  fromStopId: string;
  toStopId: string;
}

export interface NetworkData {
  stops: Stop[];
  routes: Route[];
  journeys: Journey[];
  segments: Segment[];
}

export interface RouteAtStop {
  routeId: string;
  seq: number;
}

export interface Network {
  stops: Map<string, Stop>;
  routes: Map<string, Route>;
  journeys: Map<string, Journey>;
  /** stopId → every (route, seq) that serves it */
  stopRoutes: Map<string, RouteAtStop[]>;
  /** routeId → stopId → seq */
  seqOf: Map<string, Map<string, number>>;
  /** routeId → journeys sorted by departure */
  journeysByRoute: Map<string, Journey[]>;
  /** busId → journeys sorted by departure */
  journeysByBus: Map<string, Journey[]>;
  segmentByPair: Map<string, Segment>;
}
