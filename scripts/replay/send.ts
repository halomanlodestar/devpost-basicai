/** @format */

// Plays the conductor's device: signs exactly like a real one would.

import { sign } from "@app/core/sign";
import type { WireEvent } from "@app/core/types";
import type { Emitter, SendOptions, SendResult } from "./types";

export const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:4000";

export async function send(
  emitter: Emitter,
  events: WireEvent[],
  opts: SendOptions = {},
): Promise<SendResult> {
  const body = JSON.stringify({ events });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = opts.forge ? "not-the-real-key" : emitter.secret;
  const res = await fetch(`${INGEST_URL}/ingest/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emitter-Id": emitter.id,
      "X-Timestamp": timestamp,
      "X-Signature": sign(secret, timestamp, body),
    },
    body,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

export const event = (stopId: string, occurredAt: number): WireEvent => ({
  idempotencyKey: crypto.randomUUID(),
  stopId,
  occurredAt: new Date(occurredAt).toISOString(),
});
