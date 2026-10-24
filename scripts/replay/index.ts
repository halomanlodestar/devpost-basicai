/** @format */

// The demo conductor. Signs ticket events exactly like a real device would.
//
//   bun run replay -- --scenario demo [--speed 60] [--journeys 2] [--from "Raj Nagar"] [--to "Mohan Nagar"]
//   bun run replay -- --send <stop> [--bus R1-A] [--at 14:05] [--forge] [--dup]
//   bun run replay -- --batch "LAL_KUAN@14:05,VIJAY_NAGAR@14:12" [--bus R1-A]
//
// Stops are ids or names ("Raj Nagar" → RAJ_NAGAR). --at is today, service time.

import { dayStart, MIN, serviceDate } from "@app/core";
import { stopId } from "@app/db/network";
import { parseArgs } from "node:util";
import { loadEmitters } from "./emitters";
import { runDemo } from "./scenario";
import { event, send } from "./send";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    scenario: { type: "string" },
    speed: { type: "string", default: "1" },
    journeys: { type: "string", default: "2" },
    from: { type: "string", default: "Raj Nagar" },
    to: { type: "string", default: "Mohan Nagar" },
    send: { type: "string" },
    batch: { type: "string" },
    bus: { type: "string", default: "R1-A" },
    at: { type: "string" },
    forge: { type: "boolean", default: false },
    dup: { type: "boolean", default: false },
  },
});

const emitters = loadEmitters();

if (values.scenario) {
  if (values.scenario !== "demo")
    throw new Error(`unknown scenario ${values.scenario}`);
  await runDemo(emitters, {
    speed: Number(values.speed),
    journeys: Number(values.journeys),
    from: stopId(values.from),
    to: stopId(values.to),
  });
  process.exit(0);
}

function time(hhmm?: string): number {
  if (!hhmm) return Date.now();
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return dayStart(serviceDate(Date.now())) + (h * 60 + m) * MIN;
}

const emitter = emitters.get(`EM-${values.bus}`);
if (!emitter) throw new Error(`no emitter for bus ${values.bus}`);

const events = values.batch
  ? values.batch.split(",").map((part) => {
      const [stop, at] = part.split("@") as [string, string | undefined];
      return event(stopId(stop), time(at));
    })
  : values.send
    ? [event(stopId(values.send), time(values.at))]
    : [];
if (events.length === 0)
  throw new Error(
    "nothing to send: use --scenario demo, --send <stop> or --batch",
  );

const label = values.forge ? "forged" : `bus ${values.bus}`;
const first = await send(emitter, events, { forge: values.forge });
console.log(
  `${label} · ${events.length} event(s) → ${first.status}`,
  first.body,
);
if (values.dup) {
  const again = await send(emitter, events);
  console.log(`re-sent same event(s) → ${again.status}`, again.body);
}
