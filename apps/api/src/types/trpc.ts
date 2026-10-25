/** @format */

import type { appRouter } from "../trpc/router";
import type { Db } from "@app/db";
import type { AlertScheduler } from "../alerts/scheduler";
import type { Hub } from "../hub";
import type { State } from "./state";

export interface Deps {
  state: State;
  hub: Hub;
  db: Db;
  alerts: AlertScheduler;
  tz: string;
}

export interface Context extends Deps {
  req: Request;
}

export type AppRouter = typeof appRouter;
