/** @format */

import type { appRouter } from "../trpc/router";
import type { State } from "./state";

export interface Deps {
  state: State;
  tz: string;
}

export interface Context extends Deps {
  req: Request;
}

export type AppRouter = typeof appRouter;
