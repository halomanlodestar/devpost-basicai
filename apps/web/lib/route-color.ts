/** @format */

import type { RouteColor } from "@/types/route";

/** "1 · ABES College → Mohan Nagar" → "1" */
export const routeNumber = (routeName: string) => routeName.split(" · ")[0]!;

/** Each route's own color; routes without one fall back to the brand coral. */
export function routeColor(routeName: string): RouteColor {
  const n = routeNumber(routeName);

  return {
    bg: `var(--route-${n}, var(--route))`,
    ink: `var(--route-${n}-ink, var(--route-foreground))`,
  };
}

/** A two-route interchange dot: half one color, half the other. */
export const interchange = (from: string, to: string) =>
  `conic-gradient(${routeColor(from).bg} 0 50%, ${routeColor(to).bg} 50% 100%)`;

/** Link to a route's line view, focused on the rider's bus and their part of the line. */
export function lineHref(
  routeId: string,
  opts: { journeyId?: string; board?: string; alight?: string },
) {
  const q = new URLSearchParams();

  if (opts.journeyId) q.set("journey", opts.journeyId);
  if (opts.board) q.set("board", opts.board);
  if (opts.alight) q.set("alight", opts.alight);

  return `/line/${encodeURIComponent(routeId)}${q.size ? `?${q}` : ""}`;
}
