/** @format */

"use client";

import { useParams, useSearchParams } from "next/navigation";
import { JourneyRow } from "@/components/journey-row";
import { PlanHeader } from "@/components/plan-header";
import { PlanFallback } from "@/components/plan-state";
import { useNow } from "@/hooks/use-now";
import { usePlan } from "@/hooks/use-plan";

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

  return (
    <>
      <PlanHeader from={from} to={to} back={back} />
      {option ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Bus {option.routes.join(" → ")}
          </p>
          <ul className="space-y-3">
            {option.journeys.map((j) => (
              <JourneyRow key={j.id} j={j} now={now} />
            ))}
          </ul>
        </>
      ) : query.data?.kind === "ok" ? (
        <p className="py-10 text-center text-muted-foreground">
          No more buses on this option today.
        </p>
      ) : (
        <PlanFallback query={query} from={from} to={to} />
      )}
    </>
  );
}
