/** @format */

import { StopIdsInputSchema, StopSearchInputSchema } from "@app/core";
import { publicProcedure, router } from "../init";

export const stopsRouter = router({
  /** As the rider types: a few ranked matches, never the whole list. */
  search: publicProcedure
    .input(StopSearchInputSchema)
    .query(({ ctx, input }) => ctx.state.searchStops(input.q, input.limit)),

  /** Names for stops the page already has ids for (e.g. from the URL). */
  byIds: publicProcedure.input(StopIdsInputSchema).query(({ ctx, input }) =>
    input.ids.flatMap((id) => {
      const stop = ctx.state.net.stops.get(id);

      return stop ? [stop] : [];
    }),
  ),
});
