/** @format */

// POST /ingest/events — the device contract. A raw route, not tRPC: fixed headers,
// and the HMAC is computed over the exact bytes received.

import { IngestBodySchema } from "@app/core";
import type { Db } from "@app/db";
import type { Hub } from "../hub";
import type { State } from "../types";
import { applyBatch } from "./apply";
import { verifyRequest } from "./verify";

export function ingestHandler(
  db: Db,
  state: State,
  hub: Hub,
  tz: string,
  encKey: string,
) {
  return async (req: Request) => {
    const raw = await req.text();
    const emitter = await verifyRequest(db, req, raw, encKey);

    if (!emitter)
      return Response.json({ error: "invalid signature" }, { status: 401 });

    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch {
      return Response.json({ error: "body is not JSON" }, { status: 400 });
    }

    const body = IngestBodySchema.safeParse(json);

    if (!body.success)
      return Response.json({ error: body.error.issues }, { status: 400 });

    const { response, routeIds } = await applyBatch(
      db,
      state,
      tz,
      emitter,
      body.data.events,
    );

    hub.routesChanged(routeIds);

    return Response.json(response);
  };
}
