/** @format */

// Live results over SSE (spec > Live Updates). One computed result per watched
// thing — a From → To plan or a single line — recomputed only when a trip on
// one of its routes changes, plus a 30s tick so clamps, passed journeys and
// "x min ago" stay honest.

import { pairKey } from "@app/core";
import type { LineInput, LineView, PlanResult } from "@app/core/types";
import { computeLine, computePlan, routesFor } from "./planning";
import type { State, Subscriber, Watched } from "./types";

export const TICK_MS = 30_000;

export class Hub {
  private watched = new Map<string, Watched>();
  /** routeId → keys whose result rides on it */
  private byRoute = new Map<string, Set<string>>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private state: State,
    private tz: string,
  ) {}

  start() {
    this.timer ??= setInterval(
      () => this.refresh(this.watched.keys()),
      TICK_MS,
    );
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Called after ingest commits: recompute everything riding on these routes. */
  routesChanged(routeIds: Iterable<string>) {
    const keys = new Set<string>();

    for (const r of routeIds)
      for (const k of this.byRoute.get(r) ?? []) keys.add(k);

    this.refresh(keys);
  }

  get watching() {
    let n = 0;

    for (const w of this.watched.values()) n += w.subs.size;

    return n;
  }

  watchPlan(from: string, to: string, signal?: AbortSignal) {
    return this.stream<PlanResult>(
      `plan:${pairKey(from, to)}`,
      () => routesFor(this.state, from, to),
      () => computePlan(this.state, this.tz, from, to),
      signal,
    );
  }

  watchLine(input: LineInput, signal?: AbortSignal) {
    return this.stream<LineView | null>(
      `line:${input.routeId}:${input.journeyId ?? ""}`,
      () => new Set([input.routeId]),
      () => computeLine(this.state, this.tz, input),
      signal,
    );
  }

  private async *stream<T>(
    key: string,
    routeIds: () => Set<string>,
    compute: () => T,
    signal?: AbortSignal,
  ): AsyncGenerator<T> {
    const w = this.join(key, routeIds, compute);
    const sub: Subscriber = { dirty: true, wake: null };

    w.subs.add(sub);

    const onAbort = () => sub.wake?.();

    signal?.addEventListener("abort", onAbort);

    try {
      while (!signal?.aborted) {
        if (!sub.dirty)
          await new Promise<void>((resolve) => (sub.wake = resolve));

        sub.wake = null;

        if (signal?.aborted) break;

        sub.dirty = false;

        yield w.latest as T;
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
      this.leave(key, sub);
    }
  }

  private join(
    key: string,
    routeIds: () => Set<string>,
    compute: () => unknown,
  ): Watched {
    let w = this.watched.get(key);

    if (!w) {
      w = { routeIds: routeIds(), compute, subs: new Set(), latest: compute() };
      this.watched.set(key, w);

      for (const r of w.routeIds) {
        const keys = this.byRoute.get(r) ?? new Set<string>();

        keys.add(key);
        this.byRoute.set(r, keys);
      }
    }

    return w;
  }

  private leave(key: string, sub: Subscriber) {
    const w = this.watched.get(key);

    if (!w) return;

    w.subs.delete(sub);

    if (w.subs.size > 0) return;

    this.watched.delete(key);

    for (const r of w.routeIds) {
      const keys = this.byRoute.get(r);

      keys?.delete(key);

      if (keys?.size === 0) this.byRoute.delete(r);
    }
  }

  private refresh(keys: Iterable<string>) {
    for (const key of keys) {
      const w = this.watched.get(key);

      if (!w) continue;

      w.latest = w.compute();

      for (const sub of w.subs) {
        sub.dirty = true;
        sub.wake?.();
      }
    }
  }
}
