/** @format */

// Live results over SSE (spec > Live Updates). One computed result per watched
// (from, to) pair, recomputed only when a trip on one of its routes changes,
// plus a 30s tick so clamps, passed journeys and "x min ago" stay honest.

import { pairKey } from "@app/core";
import type { PlanResult } from "@app/core/types";
import { computePlan, routesFor } from "./planning";
import type { State, Subscriber, WatchedPair } from "./types";

export const TICK_MS = 30_000;

export class Hub {
  private pairs = new Map<string, WatchedPair>();
  /** routeId → pair keys whose options ride on it */
  private byRoute = new Map<string, Set<string>>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private state: State,
    private tz: string,
  ) {}

  start() {
    this.timer ??= setInterval(() => this.refresh(this.pairs.keys()), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Called after ingest commits: recompute every pair touching these routes. */
  routesChanged(routeIds: Iterable<string>) {
    const keys = new Set<string>();
    for (const r of routeIds)
      for (const k of this.byRoute.get(r) ?? []) keys.add(k);
    this.refresh(keys);
  }

  get watching() {
    let n = 0;

    for (const p of this.pairs.values()) n += p.subs.size;

    return n;
  }

  async *watch(
    from: string,
    to: string,
    signal?: AbortSignal,
  ): AsyncGenerator<PlanResult> {
    const pair = this.join(from, to);
    const sub: Subscriber = { dirty: true, wake: null };

    pair.subs.add(sub);

    const onAbort = () => sub.wake?.();

    signal?.addEventListener("abort", onAbort);

    try {
      while (!signal?.aborted) {
        if (!sub.dirty)
          await new Promise<void>((resolve) => (sub.wake = resolve));

        sub.wake = null;

        if (signal?.aborted) break;

        sub.dirty = false;

        yield pair.latest!;
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
      this.leave(pairKey(from, to), sub);
    }
  }

  private join(from: string, to: string): WatchedPair {
    const key = pairKey(from, to);
    let pair = this.pairs.get(key);

    if (!pair) {
      pair = {
        from,
        to,
        routeIds: routesFor(this.state, from, to),
        subs: new Set(),
        latest: computePlan(this.state, this.tz, from, to),
      };

      this.pairs.set(key, pair);

      for (const r of pair.routeIds) {
        const keys = this.byRoute.get(r) ?? new Set<string>();

        keys.add(key);
        this.byRoute.set(r, keys);
      }
    }

    return pair;
  }

  private leave(key: string, sub: Subscriber) {
    const pair = this.pairs.get(key);

    if (!pair) return;

    pair.subs.delete(sub);

    if (pair.subs.size > 0) return;

    this.pairs.delete(key);

    for (const r of pair.routeIds) {
      const keys = this.byRoute.get(r);
      keys?.delete(key);

      if (keys?.size === 0) this.byRoute.delete(r);
    }
  }

  private refresh(keys: Iterable<string>) {
    for (const key of keys) {
      const pair = this.pairs.get(key);

      if (!pair) continue;

      pair.latest = computePlan(this.state, this.tz, pair.from, pair.to);

      for (const sub of pair.subs) {
        sub.dirty = true;
        sub.wake?.();
      }
    }
  }
}
