/** @format */

import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export function createContext({ req }: FetchCreateContextFnOptions) {
  return { req };
}

const t = initTRPC.context<typeof createContext>().create({
  sse: { ping: { enabled: true, intervalMs: 15_000 } },
});

export const router = t.router;
export const publicProcedure = t.procedure;
