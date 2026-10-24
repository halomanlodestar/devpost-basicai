/** @format */

import type { appRouter } from "../trpc/router";
import type { Hub } from "../hub";
import type { State } from "./state";

export interface Deps {
  state: State;
  hub: Hub;
  tz: string;
}

export interface Context extends Deps {
  req: Request;
}

export type AppRouter = typeof appRouter;
