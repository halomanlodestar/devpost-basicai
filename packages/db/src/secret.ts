/** @format */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Emitter secrets at rest: base64(iv ‖ tag ‖ ciphertext), AES-256-GCM.

function key(hex: string) {
  const k = Buffer.from(hex, "hex");
  if (k.length !== 32)
    throw new Error("EMITTER_KEY_ENC_KEY must be 32 bytes of hex");
  return k;
}

export function encryptSecret(secret: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyHex), iv);
  const ct = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(blob: string, keyHex: string): string {
  const raw = Buffer.from(blob, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(keyHex),
    raw.subarray(0, 12),
  );
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
