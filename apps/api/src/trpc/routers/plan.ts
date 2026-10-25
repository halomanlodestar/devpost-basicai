/** @format */

import { PlanInputSchema } from "@app/core";
import { TRPCError } from "@trpc/server";
import { computePlan } from "../../planning";
import type { Context } from "../../types";
import { publicProcedure, router } from "../init";

function assertStops(ctx: Context, from: string, to: string) {
  for (const id of [from, to])
    if (!ctx.state.net.stops.has(id))
      throw new TRPCError({ code: "NOT_FOUND", message: `Unknown stop ${id}` });
}

export const planRouter = router({
  search: publicProcedure.input(PlanInputSchema).query(({ ctx, input }) => {
    assertStops(ctx, input.from, input.to);
    return computePlan(ctx.state, ctx.tz, input.from, input.to);
  }),

  /** Results and Journeys, live: first result immediately, then on every relevant trip update. */
  watch: publicProcedure.input(PlanInputSchema).subscription(async function* ({
    ctx,
    input,
    signal,
  }) {
    assertStops(ctx, input.from, input.to);
    yield* ctx.hub.watchPlan(input.from, input.to, signal);
  }),
});
