/** @format */

import { publicProcedure, router } from "../init";

export const stopsRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    [...ctx.state.net.stops.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  ),
});
