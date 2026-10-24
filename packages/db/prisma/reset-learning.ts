/** @format */

// Wipes derived trip state so a demo recording starts from the timetable.
// Learned segment stats join this in slice 3.
import { createDb } from "../src";

const db = createDb(process.env.DATABASE_URL!);
await db.$executeRawUnsafe(`TRUNCATE "trip" CASCADE`);
console.log("reset: trips cleared");
await db.$disconnect();
