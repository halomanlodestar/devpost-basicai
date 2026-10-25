/** @format */

"use client";

import { ChevronRight } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Fragment } from "react";
import { Clock } from "@/components/clock";
import { JourneyTimeline } from "@/components/journey-timeline";
import { LateLabel } from "@/components/late-label";
import { LaterBuses } from "@/components/later-buses";
import { PlanHeader } from "@/components/plan-header";
import { PlanFallback } from "@/components/plan-state";
import { RouteChip } from "@/components/route-chip";
import { useNow } from "@/hooks/use-now";
import { usePlan } from "@/hooks/use-plan";
import { lineHref } from "@/lib/route-color";

export function Journeys() {
  const params = useSearchParams();
  const { optionId } = useParams<{ optionId: string }>();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const query = usePlan(from, to);
  const now = useNow();
  const back = `/plan?${new URLSearchParams({ from, to })}`;
  const option =
    query.data?.kind === "ok"
      ? query.data.options.find((o) => o.id === decodeURIComponent(optionId))
      : undefined;
  const j = option?.next;

  return (
    <div className="flex flex-col gap-6">
      <PlanHeader
        back={back}
        from={from}
        to={to}
        reconnecting={query.reconnecting}
      >
        {j?.legs.map((l, i) => (
          <Fragment key={l.journeyId}>
            {i > 0 && (
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            )}
            <RouteChip
              name={l.routeName}
              href={lineHref(l.routeId, {
                journeyId: l.journeyId,
                board: l.boardStopId,
                alight: l.alightStopId,
              })}
            />
          </Fragment>
        ))}
      </PlanHeader>
      {option && j ? (
        <>
          <section className="flex flex-col gap-1.5">
            <span className="text-[15px] font-semibold text-muted-foreground">
              Be there by
            </span>
            <Clock
              ms={j.beAtStopBy}
              className="text-[68px] leading-[.95] font-extrabold"
            />
            {j.status === "active" ? (
              <LateLabel lateMin={j.lateMin} className="mt-1.5 text-base" />
            ) : (
              <span className="mt-1.5 text-base font-semibold text-muted-foreground">
                Not started yet
              </span>
            )}
          </section>
          <JourneyTimeline journey={j} now={now} />
          <LaterBuses journeys={option.journeys.slice(1, 2)} title="Next bus" />
        </>
      ) : query.data?.kind === "ok" ? (
        <p className="py-10 text-center text-muted-foreground">
          No more buses on this route today.
        </p>
      ) : (
        <PlanFallback query={query} from={from} to={to} />
      )}
    </div>
  );
}
