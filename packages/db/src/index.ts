/** @format */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export function createDb(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export type Db = ReturnType<typeof createDb>;
export * from "./generated/prisma/client";
