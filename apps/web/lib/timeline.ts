/** @format */

import type { JourneyView } from "@app/core/types";
import type { TimelineRow } from "@/types/timeline";

/** Every leg's stops as one list: last-seen bus → your stop → change → next bus → destination. */
export function timelineRows(journey: JourneyView): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const lastLeg = journey.legs.length - 1;
  let boarded = false;

  journey.legs.forEach((leg, li) => {
    const lastStop = leg.stops.length - 1;

    leg.stops.forEach((s, i) => {
      if (li > 0 && i === 0) return; // the change stop, already shown as the previous leg's end

      const isBoard = li === 0 && s.stopId === leg.boardStopId;
      const kind =
        li === 0 && i === 0 && !isBoard
          ? "bus"
          : isBoard
            ? "board"
            : i === lastStop
              ? li === lastLeg
                ? "end"
                : "change"
              : "stop";

      boarded ||= isBoard;

      const next = kind === "change" ? journey.legs[li + 1]! : undefined;

      rows.push({
        kind,
        stopId: s.stopId,
        name: s.name,
        at: kind === "end" ? journey.arriveBy : s.est,
        routeName: leg.routeName,
        beforeBoard: !boarded,
        nextRouteName: next?.routeName,
        waitMin: next?.waitMinBefore,
      });

      if (next)
        rows.push({
          kind: "depart",
          stopId: s.stopId,
          at: next.boardEst,
          routeName: next.routeName,
          beforeBoard: false,
        });
    });
  });

  return rows;
}
