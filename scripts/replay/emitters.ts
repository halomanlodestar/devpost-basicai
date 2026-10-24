/** @format */

import type { Emitter } from "./types";

/** EMITTER_SECRETS=EM-R1-A:hex,EM-R1-B:hex,… (written by db:seed). */
export function loadEmitters(): Map<string, Emitter> {
  const raw = process.env.EMITTER_SECRETS;
  if (!raw)
    throw new Error("EMITTER_SECRETS missing: run `bun run db:seed` first");
  return new Map(
    raw.split(",").map((pair) => {
      const [id, secret] = pair.split(":") as [string, string];
      return [id, { id, secret }];
    }),
  );
}
