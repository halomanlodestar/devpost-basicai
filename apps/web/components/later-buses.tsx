/** @format */

import type { JourneyView } from "@app/core/types";
import { Clock } from "@/components/clock";

interface LaterBusesProps {
  journeys: JourneyView[];
  title?: string;
}

export function LaterBuses({
  journeys,
  title = "Later buses",
}: LaterBusesProps) {
  if (journeys.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="pl-1 text-[13px] font-semibold text-muted-foreground">
        {title}
      </h2>
      {journeys.map((j) => (
        <div
          key={j.id}
          className="grid grid-cols-2 rounded-lg bg-card px-[18px] py-3.5"
        >
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">
              Be there by
            </span>
            <Clock ms={j.beAtStopBy} className="text-[22px] font-extrabold" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">
              Arrive
            </span>
            <Clock ms={j.arriveBy} className="text-[22px] font-bold" />
          </div>
        </div>
      ))}
    </section>
  );
}
