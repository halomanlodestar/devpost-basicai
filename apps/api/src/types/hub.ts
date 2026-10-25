/**
 * One open subscription stream.
 *
 * @format
 */

export interface Subscriber {
  /** a newer result is waiting to be sent */
  dirty: boolean;
  wake: (() => void) | null;
}

/** All streams watching one thing (a From → To plan, a line), sharing one computed result. */
export interface Watched {
  routeIds: Set<string>;
  compute: () => unknown;
  subs: Set<Subscriber>;
  latest: unknown;
}
