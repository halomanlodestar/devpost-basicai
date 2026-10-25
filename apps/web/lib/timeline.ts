/** @format */

import type { JourneyView } from "@app/core/types";
import type { TimelineRow } from "@/types/timeline";

/** Every leg's stops as one list: last-seen bus → your stop → (change, wait) → destination. */
export function timelineRows(journey: JourneyView): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const lastLeg = journey.legs.length - 1;

  journey.legs.forEach((leg, li) => {
    const lastStop = leg.stops.length - 1;

    leg.stops.forEach((s, i) => {
      if (li > 0 && i === 0) return; // the change stop, already shown as the previous leg's end

      const kind =
        li === 0 && i === 0 && s.stopId !== leg.boardStopId
          ? "bus"
          : li === 0 && s.stopId === leg.boardStopId
            ? "board"
            : i === lastStop
              ? li === lastLeg
                ? "end"
                : "change"
              : "stop";

      rows.push({
        kind,
        stopId: s.stopId,
        name: s.name,
        at: kind === "end" ? journey.arriveBy : s.est,
      });

      if (kind === "change") {
        const next = journey.legs[li + 1]!;

        rows.push({
          kind: "wait",
          stopId: s.stopId,
          waitMin: next.waitMinBefore ?? 0,
          routeName: next.routeName,
          departs: next.boardEst,
        });
      }
    });
  });

  return rows;
}
