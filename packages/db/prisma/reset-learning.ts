/** @format */

// Wipes learned times, trip state and events so a demo recording starts from the timetable.
import { createDb } from "../src";

const db = createDb(process.env.DATABASE_URL!);
await db.$executeRawUnsafe(
  `TRUNCATE "segment_stat", "ticket_event", "trip" CASCADE`,
);
console.log("reset: learned segment times, trips and ticket events cleared");
await db.$disconnect();
