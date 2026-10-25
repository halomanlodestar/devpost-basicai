/** @format */

import type { Db } from "@app/db";
import { SIGNATURE_WINDOW_SEC, verifySignature } from "@app/core/sign";
import type { VerifiedEmitter } from "../types";

/**
 * Checks X-Emitter-Id / X-Timestamp / X-Signature against the emitter's own key.
 * Unknown, revoked, forged or replayed (send time > 5 min off) → null.
 */
export async function verifyRequest(
  db: Db,
  req: Request,
  rawBody: string,
): Promise<VerifiedEmitter | null> {
  const id = req.headers.get("x-emitter-id");
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");

  // the device only ever sees "invalid signature"; the reason stays in the server log
  const reject = (reason: string) => {
    console.warn(`ingest 401 ${id ?? "?"}: ${reason}`);
    return null;
  };

  if (!id || !timestamp || !signature) return reject("missing headers");

  const emitter = await db.emitter.findUnique({ where: { id } });

  if (!emitter) return reject("unknown emitter");
  if (emitter.revokedAt) return reject("revoked");

  const nowSec = Math.floor(Date.now() / 1000);

  if (Math.abs(nowSec - Number(timestamp)) > SIGNATURE_WINDOW_SEC)
    return reject(`timestamp ${timestamp} vs server ${nowSec}`);

  return verifySignature(emitter.secret, timestamp, rawBody, signature, nowSec)
    ? { id: emitter.id, busId: emitter.busId }
    : reject("signature mismatch");
}
