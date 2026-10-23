/** @format */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { withCors } from "./cors";
import { env } from "./env";
import { createContext } from "./trpc/init";
import { appRouter } from "./trpc/router";

const trpc = withCors((req) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext,
  }),
);

const server = Bun.serve({
  port: env.PORT,
  idleTimeout: 0, // SSE streams stay open; tRPC pings every 15s
  routes: {
    "/health": new Response("ok"),
    "/trpc/*": trpc,
  },
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(`api listening on ${server.url}`);
