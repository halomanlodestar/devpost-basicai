/** @format */

// The device signing contract, shared by the API (verify) and the replay script (sign).
// X-Signature = hex(HMAC-SHA256(secret, X-Timestamp + "." + rawBody)), like a signed webhook.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Requests whose X-Timestamp is further than this from server time are replays. */
export const SIGNATURE_WINDOW_SEC = 5 * 60;

export function sign(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export function verifySignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
  nowSec: number,
): boolean {
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(nowSec - ts) > SIGNATURE_WINDOW_SEC)
    return false;
  const expected = Buffer.from(sign(secret, timestamp, rawBody), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
