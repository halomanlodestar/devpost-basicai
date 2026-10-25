/** @format */

// Issues every emitter in DATABASE_URL a fresh secret and rewrites scripts/replay/.env.
// Unlike db:seed it touches nothing else: learning, trips, devices and alerts stay.
// Use it when the replay's keys and a database's keys have drifted apart (401 invalid signature).

import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { createDb } from "../src";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const target = new URL(DATABASE_URL);
console.log(`rekeying emitters in ${target.host}${target.pathname}`);

const db = createDb(DATABASE_URL);

const existing = await db.emitter.findMany({
  where: { revokedAt: null },
  orderBy: { id: "asc" },
});
if (existing.length === 0)
  throw new Error("no emitters in this database: run db:seed against it first");

const emitters = existing.map((e) => ({
  id: e.id,
  secret: randomBytes(32).toString("hex"),
}));

await db.$transaction(
  emitters.map(({ id, secret }) =>
    db.emitter.update({ where: { id }, data: { secret } }),
  ),
);

const envPath = join(import.meta.dir, "../../../scripts/replay/.env");
await Bun.write(
  envPath,
  `# Written by db:rekey. Emitter id → HMAC secret, like keys issued to real devices.\n` +
    `EMITTER_SECRETS=${emitters.map((e) => `${e.id}:${e.secret}`).join(",")}\n`,
);

console.log(
  `rekeyed ${emitters.length} emitters; secrets → scripts/replay/.env`,
);
await db.$disconnect();
