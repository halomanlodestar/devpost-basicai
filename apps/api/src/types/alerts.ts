/**
 * An open alert as the scheduler holds it in memory.
 *
 * @format
 */

export interface OpenAlert {
  id: string;
  deviceId: string;
  journeyId: string;
  serviceDate: string;
  fromStopId: string;
  toStopId: string;
  url: string;
  sentThresholds: number[];
  lastLateBucket: number;
}

/** The push a notification shows. ≤ 4 KB as JSON. */
export interface PushPayload {
  title: string;
  body: string;
  /** opened when the notification is tapped */
  url: string;
  /** same tag replaces the previous notification for this alert */
  tag: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushOutcome = "sent" | "gone" | "failed";

/** Where the rider's bus is predicted to be, for one alert. */
export interface AlertPrediction {
  routeName: string;
  stopName: string;
  beAtStopBy: number;
  lateMin: number;
  /** the bus has passed the rider's stop, finished, or the day is over */
  done: boolean;
}

export interface DeviceCredentials {
  deviceId: string;
  secret: string;
}

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface RegisterDeviceInput {
  endpoint: string;
  keys: PushKeys;
}

export interface CreateAlertInput extends DeviceCredentials {
  journeyId: string;
  serviceDate: string;
  fromStopId: string;
  toStopId: string;
  url: string;
}

export interface CancelAlertInput extends DeviceCredentials {
  alertId: string;
}
