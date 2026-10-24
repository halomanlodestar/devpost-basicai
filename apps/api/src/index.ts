/** @format */

import { createDb } from "@app/db";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { withCors } from "./cors";
import { env } from "./env";
import { Hub } from "./hub";
import { ingestHandler } from "./ingest/route";
import { loadState } from "./state";
import { makeCreateContext } from "./trpc/init";
import { appRouter } from "./trpc/router";

const db = createDb(env.DATABASE_URL);
const state = await loadState(db);
const hub = new Hub(state, env.TZ_SERVICE);
hub.start();
const createContext = makeCreateContext({ state, hub, tz: env.TZ_SERVICE });

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
    "/ingest/events": {
      POST: ingestHandler(
        db,
        state,
        hub,
        env.TZ_SERVICE,
        env.EMITTER_KEY_ENC_KEY,
      ),
    },
  },
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(
  `api listening on ${server.url} · ${state.net.stops.size} stops, ${state.net.routes.size} routes, ` +
    `${state.net.journeys.size} journeys, ${state.trips.size} open trips in memory`,
);
