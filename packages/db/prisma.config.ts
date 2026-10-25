/** @format */

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "bun prisma/seed.ts" },
  // `prisma generate` needs no database (the web build only wants the types), so a
  // missing DATABASE_URL is fine there; migrate/seed fail clearly without one.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
