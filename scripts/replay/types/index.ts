/** @format */

export interface Emitter {
  id: string;
  secret: string;
}

export interface SendOptions {
  /** sign with a wrong key: the API must reject it */
  forge?: boolean;
}

export interface SendResult {
  status: number;
  body: unknown;
}

/** One planned step of a scenario, at a virtual time. */
export interface Step {
  at: number;
  run: () => Promise<void>;
}

/** A demo journey: which bus runs which timetabled departure. */
export interface DemoJourney {
  routeCode: string;
  busId: string;
  departureMin: number;
  /** true minutes from departure to each stop (the ground truth the timetable gets wrong) */
  realOffsets: number[];
}

export interface ScenarioOptions {
  speed: number;
  journeys: number;
  /** the rider's search, for narration: what their phone shows at each beat */
  from: string;
  to: string;
}

/** Shape of a tRPC query over plain HTTP. */
export interface TrpcQueryResponse<T> {
  result: { data: T };
}
