/** @format */

import { LineInputSchema } from "@app/core";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../init";

export const lineRouter = router({
  /** One bus line end to end, live: every bus on it and the rider's bus's time at each stop. */
  watch: publicProcedure.input(LineInputSchema).subscription(async function* ({
    ctx,
    input,
    signal,
  }) {
    if (!ctx.state.net.routes.has(input.routeId))
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Unknown route ${input.routeId}`,
      });

    yield* ctx.hub.watchLine(input, signal);
  }),
});
