/**
 * What this browser keeps so the API knows its alerts are its own.
 *
 * @format
 */

export interface StoredDevice {
  deviceId: string;
  secret: string;
  /** the push subscription it was registered with; a new one means re-register */
  endpoint: string;
}

/** Whether this browser can get alerts at all, and whether the rider allowed them. */
export type PushSupport = "unsupported" | "default" | "granted" | "denied";

/** The journey a Notify me is for. */
export interface NotifyTarget {
  journeyId: string;
  serviceDate: string;
  fromStopId: string;
  toStopId: string;
  /** the screen to open when a push is tapped */
  url: string;
}

/** What the Notify me button needs to render and act. */
export interface NotifyState {
  support: PushSupport;
  /** this journey already has alerts on, on this device */
  on: boolean;
  busy: boolean;
  failed: boolean;
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
}
