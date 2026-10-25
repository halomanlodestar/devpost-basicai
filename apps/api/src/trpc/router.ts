/** @format */

import { router } from "./init";
import { lineRouter } from "./routers/line";
import { planRouter } from "./routers/plan";
import { stopsRouter } from "./routers/stops";

export const appRouter = router({
  stops: stopsRouter,
  plan: planRouter,
  line: lineRouter,
});
