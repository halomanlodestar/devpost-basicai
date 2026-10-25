---
doc: scope
status: approved
---

# On the way: Ticket-Driven Bus ETAs

Tells a day scholar how long until their bus reaches their stop, using the ticket machine the conductor already carries instead of GPS.

## The Unique Kernel
**The ticket machine is the GPS.** Every ticket cut at a stop is a signed "bus is at stop Y, at time T" event. The system learns real stop-to-stop travel times from its own history, so ETAs come from what buses actually did, not from a timetable nobody follows. A rise in the estimate means a delay, and a deliberate +5 min buffer covers false speed-ups.

It starts from the "expected" schedule and **corrects itself over time** as real trips come in.

## Who It's For
A college day scholar commuting on UPSRTC buses (the learner, in 1st year). Today they either guess from a schedule that's rarely followed, call the conductor, or wait at the stop for up to an hour with no information. They want to know whether they can stay back at college for some work and still catch the bus, and when the next bus is if they miss this one.

## The Core Loop
The rider thinks in **"from stop X to stop Y,"** not in routes. They pick X and Y (e.g. College → Home) and see the next buses that serve that pair: when each reaches X, whether it's running late, and when it gets them to Y, plus the one after. End-to-end riders are the same case (X = first stop, Y = last). They check before leaving college or while waiting, every commute day.

## Inspiration & Identity
Not discussed yet. Tone so far: practical, "just tell me how long I'll wait," no map needed.

## Why This Matters to the Learner
They lived it: "it was either now or never… we could spend hours waiting for a bus that's delayed for like 1h and we'd never know unless we call the conductor." The idea dates from 2023 and was never finished: "i dont want to rush it cuz i havent completed this project since."

## What "Working" Looks Like
A rider picks X → Y and sees the next buses (direct or with a transfer), each with an ETA at X, arrival at Y, and late/on-time status. A simulated conductor device emits signed ticket events, and the rider's results update live.

**The "oh, that's cool" beat:** start from an "expected" timetable, replay trips in fast-forward, and watch the system's ETAs pull away from the timetable toward reality. It's visibly learning that the schedule was wrong.

**Pitch point:** this is harder than metro routing. Metro planners assume connections are reliable. Here neither bus is, so transfer plans are built on *predicted* arrivals and show the real wait at the transfer stop, re-planning when a leg runs late.

## The POC Boundary
The learner's rule: **nothing is left out for time.** A feature is excluded only if the product doesn't need it. We're pitching something complete.

- **Routes and stops:** multiple routes. Each direction is its own route (an ordered list of stops), and an "expected" timetable is the starting estimate. Learned travel times live on the shared stop-to-stop edges (the graph derived from all routes), so routes sharing a road share history.
- **Emitters:** a simulator (stands in for the ticket machine) sending stop + device-side timestamp + idempotency key, HMAC-signed with a per-emitter server-issued key (like a signed webhook).
- **Dead-zone handling:** the emitter queues events while offline and flushes them on reconnect. Device timestamps keep travel-time history accurate (demoable with an "offline" toggle).
- **Ingestion:** the server verifies signatures, rejects forgeries and duplicates, and orders events by when they happened, not when they arrived.
- **ETA engine:** learned stop-to-stop travel times, +5 min buffer, delay detection.
- **X → Y lookup:** any route where X comes before Y qualifies. Show upcoming buses with ETA at X and arrival at Y, so the next bus is always visible if I miss one.
- **Transfers, metro-style:** when no single route connects X → Y, suggest "take Route A to stop M, then Route B." Transfer plans are **live**: both legs use predicted ETAs, so a late first bus re-plans the connection. Each plan shows the **predicted wait at the transfer stop** (e.g. "Route A: 15:00 → stop X 16:00; Route B reaches X at 16:20, so wait 20 min"). Options are ranked by arrival time and number of changes (RAPTOR-style).
- **Rider view:** live-updating X → Y results (e.g. SSE).
- **Admin data (no admin UI):** buses, emitter keys, routes, stops, journeys and timetables are seeded via SQL/scripts. *Revised during `3-prd`:* an admin panel is "just a UI wrapper over SQL statements," so it is revisited only if the demo needs it.
- **Fast-forward replay:** a background script replays seeded journeys (timetable deliberately ~15 min off), and the rider screen shows ETAs self-correcting. No simulator UI.
- **Accounts:** sign-in is optional for riders. Anyone can look up X → Y immediately, and signing in adds saved commutes (e.g. "College → Home"). Admins must sign in. Auth library decided in spec (learner suggests Better Auth).

## Later
Only things outside our control:
- Integration with real UPSRTC ticket machines or conductor phones. The simulator uses the same signing contract, so a real device is a drop-in.

## Not in the Design (by choice)
- **Live GPS tracking:** expensive and unnecessary, because riders need a wait time, not a moving dot.
- **Lat/long in events / map view:** events are about stops and time, and coordinates add nothing to the ETA.
- **Student-reported locations:** untrustworthy, since bad actors could alter the timeline.

## Data Model Direction (settled for now; formalized in `4-spec`)
Replaces the learner's 2023 sketch. The signed event log is the source of truth, and everything else is derived from it.
- **Network:** `stop`; `route` (one per direction, optional `reverse_of`); `route_stop` (route_id, seq, stop_id, expected_offset_min). Routes are ordered lists of stops. `segment` (from_stop → to_stop) is the directed graph derived from consecutive route stops.
- **Learning:** `segment_stat` (segment_id, ewma travel time, sample_count, time bucket TBD). Edges are shared across routes, and a stat falls back to the expected offsets when it has few samples.
- **Fleet/trust:** `bus`; `emitter` (bus_id, secret hash, active/revoked).
- **Operations:** `trip` (route, bus, status, cached last_seq/last_seen_at); `ticket_event`, append-only (emitter, trip, stop, occurred_at, received_at, unique (emitter_id, idempotency_key)).
- **Riders:** optional accounts with saved commutes (from_stop, to_stop). Auth framework tables are added in spec.
- **Efficiency (verified):** the X → Y route lookup is two covering-index seeks (~2–31 µs on 40k route_stop rows). The network is held in memory. Ingest is one transaction (dedupe insert, forward-only trip update, edge EWMA update). Riders subscribe over SSE, so DB cost scales with ticket events, not with readers.
- Open for spec: time-of-day buckets; trip resolution (implicit vs an explicit "trip start" event).
