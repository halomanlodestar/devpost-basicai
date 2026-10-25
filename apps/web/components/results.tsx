/** @format */

"use client";

import { useSearchParams } from "next/navigation";
import { LaterBuses } from "@/components/later-buses";
import { OptionCard, OptionCompact } from "@/components/option-card";
import { PlanHeader } from "@/components/plan-header";
import { PlanFallback } from "@/components/plan-state";
import { useNow } from "@/hooks/use-now";
import { usePlan } from "@/hooks/use-plan";

export function Results() {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const query = usePlan(from, to);
  const now = useNow();
  const qs = new URLSearchParams({ from, to });

  return (
    <div className="flex flex-col gap-6">
      <PlanHeader
        back="/"
        from={from}
        to={to}
        reconnecting={query.reconnecting}
      />
      {query.data?.kind === "ok" ? (
        <div className="flex flex-col gap-3">
          {query.data.options.map((o, i) => {
            const href = `/plan/${encodeURIComponent(o.id)}?${qs}`;

            return i === 0 ? (
              <OptionCard key={o.id} option={o} href={href} now={now} />
            ) : (
              <OptionCompact key={o.id} option={o} href={href} now={now} />
            );
          })}
          <div className="mt-4">
            <LaterBuses
              journeys={query.data.options[0]!.journeys.slice(1, 4)}
              now={now}
            />
          </div>
        </div>
      ) : (
        <PlanFallback query={query} from={from} to={to} />
      )}
    </div>
  );
}
