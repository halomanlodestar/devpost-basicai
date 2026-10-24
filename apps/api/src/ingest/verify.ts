/** @format */

import type { Db } from "@app/db";
import { decryptSecret } from "@app/db/secret";
import { verifySignature } from "@app/core/sign";
import type { VerifiedEmitter } from "../types";

/**
 * Checks X-Emitter-Id / X-Timestamp / X-Signature against the emitter's own key.
 * Unknown, revoked, forged or replayed (send time > 5 min off) → null.
 */
export async function verifyRequest(
  db: Db,
  req: Request,
  rawBody: string,
  encKey: string,
): Promise<VerifiedEmitter | null> {
  const id = req.headers.get("x-emitter-id");
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");

  if (!id || !timestamp || !signature) return null;

  const emitter = await db.emitter.findUnique({ where: { id } });

  if (!emitter || emitter.revokedAt) return null;

  const secret = decryptSecret(emitter.secretEnc, encKey);
  const ok = verifySignature(
    secret,
    timestamp,
    rawBody,
    signature,
    Math.floor(Date.now() / 1000),
  );

  return ok ? { id: emitter.id, busId: emitter.busId } : null;
}
