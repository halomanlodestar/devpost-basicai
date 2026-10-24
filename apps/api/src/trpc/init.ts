/** @format */

import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context, Deps } from "../types";

export function makeCreateContext(deps: Deps) {
  return ({ req }: FetchCreateContextFnOptions): Context => ({ req, ...deps });
}

const t = initTRPC.context<Context>().create({
  sse: { ping: { enabled: true, intervalMs: 15_000 } },
});

export const router = t.router;
export const publicProcedure = t.procedure;
