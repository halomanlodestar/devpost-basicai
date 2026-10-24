/** @format */

export type Bucket = "am_peak" | "midday" | "pm_peak" | "off";

/** Wall-clock fields of an instant in a time zone. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}
