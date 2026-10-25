/** @format */

// Alerts on timers (spec > Alerts and Notifications, revised in build: Postgres
// rows + in-process timers instead of BullMQ). Every open alert holds a timer
// per countdown mark still ahead. A ticket that moves the bus re-arms them from
// the new prediction; boot re-arms all open alerts from Postgres.

import { decideAlerts, serviceDate, addDays } from "@app/core";
import type { Db } from "@app/db";
import type { OpenAlert, PushPayload, State } from "../types";
import { predictAlert } from "./predict";
import { sendPush } from "./push";

/** Silent buses drift (overdue clamp) without any ticket: re-check every so often. */
export const REARM_MS = 60_000;

const clock = (ms: number, tz: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(ms)
    .replace(/\s/g, " ")
    .toLowerCase();

const busNo = (routeName: string) => routeName.split(" · ")[0];

export class AlertScheduler {
  private alerts = new Map<string, OpenAlert>();
  private timers = new Map<string, ReturnType<typeof setTimeout>[]>();
  private tick: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: Db,
    private state: State,
    private tz: string,
  ) {}

  /** Loads today's and yesterday's open alerts and arms them. */
  async boot() {
    const today = serviceDate(Date.now(), this.tz);
    const rows = await this.db.alert.findMany({
      where: {
        closedAt: null,
        serviceDate: { in: [addDays(today, -1), today, addDays(today, 1)] },
      },
    });

    for (const r of rows) this.alerts.set(r.id, r);
    for (const a of this.alerts.values()) await this.arm(a);

    this.tick ??= setInterval(() => void this.rearmAll(), REARM_MS);

    return rows.length;
  }

  get open() {
    return this.alerts.size;
  }

  /** After ingest: re-arm every alert whose bus rides one of these routes. */
  async routesChanged(routeIds: Set<string>) {
    for (const a of this.alerts.values()) {
      const j = this.state.net.journeys.get(a.journeyId);

      if (j && routeIds.has(j.routeId)) await this.arm(a);
    }
  }

  async add(a: OpenAlert) {
    this.alerts.set(a.id, a);
    await this.arm(a);
  }

  remove(alertId: string) {
    this.clear(alertId);
    this.alerts.delete(alertId);
  }

  /** Every alert of a device whose push subscription died. */
  forgetDevice(deviceId: string) {
    for (const a of [...this.alerts.values()])
      if (a.deviceId === deviceId) this.remove(a.id);
  }

  private async rearmAll() {
    for (const a of [...this.alerts.values()]) await this.arm(a);
  }

  private clear(alertId: string) {
    for (const t of this.timers.get(alertId) ?? []) clearTimeout(t);
    this.timers.delete(alertId);
  }

  private async arm(a: OpenAlert) {
    this.clear(a.id);

    const p = predictAlert(this.state, this.tz, a);

    if (!p || p.done) return this.close(a);

    const d = decideAlerts({
      beAtStopBy: p.beAtStopBy,
      lateMin: p.lateMin,
      now: Date.now(),
      sentThresholds: a.sentThresholds,
      lastLateBucket: a.lastLateBucket,
    });

    if (d.delay) {
      a.lastLateBucket = d.delay.bucket;
      await this.db.alert.update({
        where: { id: a.id },
        data: { lastLateBucket: a.lastLateBucket },
      });
      await this.push(a, {
        title: `Bus ${busNo(p.routeName)} is late by ${d.delay.lateMin} min`,
        body: `Be at ${p.stopName} by ${clock(p.beAtStopBy, this.tz)} now.`,
        url: a.url,
        tag: a.id,
      });
    }

    this.timers.set(
      a.id,
      d.countdowns.map((c) =>
        setTimeout(
          () => void this.countdown(a.id, c.minutes),
          c.fireAt - Date.now(),
        ),
      ),
    );
  }

  private async countdown(alertId: string, minutes: number) {
    const a = this.alerts.get(alertId);

    if (!a || a.sentThresholds.includes(minutes)) return;

    const p = predictAlert(this.state, this.tz, a);

    if (!p || p.done) return this.close(a);

    a.sentThresholds = [...a.sentThresholds, minutes];
    await this.db.alert.update({
      where: { id: a.id },
      data: { sentThresholds: a.sentThresholds },
    });
    await this.push(a, {
      title: `Bus ${busNo(p.routeName)} in ${minutes} min`,
      body: `Be at ${p.stopName} by ${clock(p.beAtStopBy, this.tz)}.`,
      url: a.url,
      tag: a.id,
    });

    // stays open after the last countdown: a late bus can still send "running late"
  }

  private async push(a: OpenAlert, payload: PushPayload) {
    const device = await this.db.device.findUnique({
      where: { id: a.deviceId },
    });

    if (!device) return this.remove(a.id);

    if ((await sendPush(device, payload)) === "gone") {
      this.forgetDevice(device.id);
      await this.db.device
        .delete({ where: { id: device.id } })
        .catch(() => undefined);
    }
  }

  private async close(a: OpenAlert) {
    this.remove(a.id);
    await this.db.alert
      .update({ where: { id: a.id }, data: { closedAt: new Date() } })
      .catch(() => undefined);
  }
}
