/** @format */

import { plan, PlanInputSchema, timetableOnly } from "@app/core";
import { TRPCError } from "@trpc/server";
import { tripKey } from "../../state";
import { publicProcedure, router } from "../init";

export const planRouter = router({
  search: publicProcedure.input(PlanInputSchema).query(({ ctx, input }) => {
    const { net, trips } = ctx.state;

    for (const id of [input.from, input.to])
      if (!net.stops.has(id))
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Unknown stop ${id}`,
        });

    return plan(
      { net, typical: timetableOnly, tz: ctx.tz, now: Date.now() },
      input.from,
      input.to,
      (j, d) => trips.get(tripKey(j, d)),
    );
  }),
});
