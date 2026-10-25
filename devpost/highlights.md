# Pitch Highlights

The points to hit in the demo video and the Devpost write-up. These are added as they come up during planning and build.

## The story
- **Born from a real commute.** As a 1st-year day scholar on UPSRTC buses: no reliable schedule, no tracker, and waits of up to an hour unless you called the conductor. "It was either now or never."

## The idea
- **Name: "On the way."** Don't bend your day around the bus: carry on with your work, and the app tells you when to leave.
- **The ticket machine is the GPS.** Every ticket the conductor cuts is a "bus at stop Y, time T" event. No GPS hardware, no new devices, only one HTTP call from something conductors already carry.
- **Riders need a wait time, not a moving dot.** Everything is in stops and time. No lat/long, no map.
- **No timetable needed, and it corrects itself.** It starts from the "expected" schedule and learns real stop-to-stop times from its own history. *Demo: fast-forward replay shows the ETAs pulling away from the timetable toward reality.*
- **"Late" means late versus reality, not versus the timetable.** Two numbers: *expected* (what this journey usually does, learned from history) and *estimated* (the live prediction from the bus's last ticket event). The difference is the delay. The rider always sees the prediction, never the static timetable.
- **Honest ETAs.** A deliberate +5 min buffer covers false speed-ups, and a rising estimate flags a delay.

## Harder than metro
- **Transfers on an unreliable network.** Metro planners assume connections will be there. Here neither bus is reliable, so transfer plans are built on *predicted* arrivals and show the real wait at the transfer stop ("reach X at 16:00, Route B gets there 16:20, wait 20 min"), re-planning live when a leg runs late.
- **Thinks like a rider:** "from X to Y," not "which route." End-to-end riders are the same case.

## Trust & integrity
- **Signed events.** Each emitter has its own server-issued key (HMAC, like Stripe/GitHub webhooks). Forged events are rejected, and a compromised device can be revoked.
- **Student-reported locations are deliberately excluded.** Bad actors can't alter the timeline.
- **Dead zones don't look like delays.** Events carry the device-side timestamp and queue offline, and late flushes are ordered by when they happened, never by when they arrived. Idempotency keys drop duplicate retries.

## Engineering
- **One model, two structures.** Routes are ordered lists of stops, and the stop graph is derived from them. Learned travel times live on shared graph edges, so routes sharing a road share history, and each direction is its own route.
- **Scales with buses, not riders.** Riders subscribe over SSE, so a rider read costs zero DB queries. DB work happens only when a ticket is cut (one transaction: dedupe, advance the trip, update the learned edge time).
- **Learns from the first real trip.** The first observed time replaces the timetable outright (we already know the timetable is wrong). After that it's a running mean that turns into a recency-weighted average, with outlier trimming and time-of-day buckets (morning peak ≠ midnight).
- **Built to split.** A Bun workspace with a pure-TS kernel (`packages/core`). Today it's one API process; tomorrow ingest becomes its own service, the live hub fans out over Redis pub/sub across replicas, and the alert worker runs on its own. Each is a deploy change, not a rewrite.
- **Self-correction is tested, not claimed.** A test replays a timetable that's 15 min wrong: after one observed journey, the next journey's expected arrival lands within 2 min of reality. *Demo: the 15:00 bus, with zero tickets of its own, moves from the timetable's 3:50 to 4:04 while the 14:00 bus is still on the road.*
- **Knows a breakdown from a road closure.** One wild trip (a 60-min breakdown, a clock glitch) is ignored; three slow trips in a row on the same road become the new normal. *Tested over 25 simulated days: congestion nudges the average, breakdowns don't move it, and a closure is adopted on the third trip.*
- **Measured, not guessed.** The X → Y route lookup runs as two covering-index seeks: ~2–31 µs on a synthetic network of 5,000 stops and 1,000 routes.
