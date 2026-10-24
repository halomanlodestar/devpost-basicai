---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast — the learner reviews and commits each slice themselves (their commit is their sign-off); the agent builds, verifies, hands over, and ticks the box only after their commit.

## Slices

- [x] **1. Search College → Home and see today's direct journeys (timetable-based)**
  Becomes usable: A running web app on localhost: pick From and To, tap Search, see direct route options and their journeys, nearest first, with "not started · expected [time]", be-at-stop-by (−5) and arrive-by (+5). Times come from the seeded timetable because no bus has reported yet.
  Why now: Bootstraps everything (Bun workspace, Prisma on Postgres, `Bun.serve` + tRPC fetch adapter, Next.js + shadcn) on the thinnest real behavior, and runs the spec's Bun-compatibility checks (Prisma adapter, BullMQ/ioredis, web-push) before anything depends on them. Gives UI round 1 something to react to.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `prd.md > Stop Search`, `prd.md > Route Options (Results)` (direct only), `prd.md > Journeys` (not-started rows), `prd.md > Look and Feel`
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Data Model` (network, bus, emitter, journey, trip tables), `spec.md > Network Model (in memory)`, `spec.md > Prediction` (not-started path, buffer), `spec.md > Planner (Route Options and Transfers)` (round 0), `spec.md > tRPC Router` (`stops.list`, `plan.search`), `spec.md > Web App Screens` (`/`, `/plan`, `/plan/[optionId]`), `spec.md > Look and Feel`
  Build: Scaffold the workspace per File Structure; Zod env; Prisma schema for the network/fleet/trip/event tables; seed ~25 stops, 3–4 routes per direction with one shared transfer stop, journeys, buses, encrypted emitter secrets (printed to `scripts/replay/.env`), timetables ~15 min optimistic; `packages/core` network indexes, round-0 planner, not-started prediction, schemas; API boot loads the network into memory, `Bun.serve` routes serve tRPC (fetch adapter) with a `withCors` helper; web Search (stop pickers with filter, swap, disabled Search), Results, Journeys. A small `scripts/compat` smoke that imports and exercises BullMQ, web-push and the Prisma client under Bun.
  Verify (mechanical): `bun run db:migrate && bun run db:seed` succeeds; compat smoke passes under Bun (or the Node fallback is recorded under Revisions); `bun test` passes for round-0 planning and buffer maths; `bun run dev` starts both apps; a `plan.search` call for a seeded direct pair returns options sorted by arriveBy; loading `/plan?from=…&to=…` renders rows.
  Learner check: Open http://localhost:3000, search College → Home, swap the stops, try From = To, open an option and read the journey rows. Tell me what you'd change in the look (UI round 1).
  Commit: `Scaffold workspace and add timetable-based direct search`

- [x] **2. A signed ticket event moves the bus, live, on the rider's screen**
  Becomes usable: Running the replay script (or one signed curl) makes a journey row change without a refresh: predicted time, "12 min late", "last seen at [stop] · 1 min ago". Forged, revoked and duplicate events change nothing.
  Why now: This is the kernel's first half (the ticket machine is the GPS) and the riskiest plumbing: HMAC device contract, server-side trip resolution, forward-only state, and tRPC SSE under `Bun.serve`. Everything later (learning, transfers, alerts) reacts to trip updates.
  PRD ref: `prd.md > The Core Journey` (step 5), `prd.md > Ticket Events (background, no UI)`, `prd.md > Journeys` (estimated, late, last seen), `prd.md > States and Boundaries` (stale bus)
  Spec ref: `spec.md > Ingest`, `spec.md > Trip Resolution`, `spec.md > Trip State`, `spec.md > Prediction` (active path, late, overdue clamp, passed), `spec.md > Live Updates (SSE Hub)`, `spec.md > Important Failure Modes` (SSE drops, silent bus)
  Build: `POST /ingest/events` with signature + timestamp window + AES-GCM secret decrypt, batch sort, dedupe insert, `core/resolve`, trip state update in one transaction, then in-memory update; `core/predict` estimated/late/overdue clamp/passed; `plan.watch` subscription with the hub, reverse index, 30s tick, 15s ping, `idleTimeout: 0`; web switches Results/Journeys to the subscription with a "reconnecting…" marker; `scripts/replay` signer that can send single events and batches.
  Verify (mechanical): `bun test` for resolve, trip state and ingest (valid → accepted, wrong key → 401, stale X-Timestamp → 401, same key twice → duplicate, withheld-then-flushed batch → same trip state as live); with dev running, a subscribed client receives a new payload within a second of a replay event and keeps the stream open past 30s.
  Learner check: Keep a Journeys screen open, run `bun run replay -- --send <stop>` a couple of times, and watch the row change by itself; then send a forged one and see nothing change.
  Commit: `Add signed ticket ingest and live predictions over SSE`

- [ ] **3. The timetable is wrong, and you watch the app learn that**
  Becomes usable: `bun run replay -- --scenario demo` plays two or three journeys: the first opens at timetable time and drifts to reality; a later journey opens already corrected. The console narrates the dead-zone flush, the forged event and the duplicate.
  Why now: The second half of the kernel and the "oh, that's cool" demo beat. It depends on slice 2's trip updates and should be proven before transfers and alerts build on learned times.
  PRD ref: `prd.md > Lateness and Predictions`, `prd.md > Demo Replay (script, not product)`
  Spec ref: `spec.md > Learning (Segment Stats)`, `spec.md > Prediction` (expected from learned stats), `spec.md > Demo Replay Script`, `spec.md > Decisions and Open Issues` (learning moment)
  Build: `core/learn` (skipped-stop split, IST buckets + `all`, running mean → EWMA, first sample replaces prior, outlier band); `segment_stat` table and its update inside the ingest transaction; expected-time uses `typical()` with fallbacks; replay `reality` table, `--scenario demo` with dead zone/forged/duplicate beats and `--speed N`; `db:reset-learning`.
  Verify (mechanical): `bun test` replays a 15-min-wrong timetable and asserts the second journey's expected time at the far stop is within ~2 min of reality, plus outlier rejection and bucket fallback; `replay --scenario demo --speed 60` completes with the narrated beats and the API shows changed `segment_stat` rows.
  Learner check: Run the demo scenario at `--speed 60` with Journeys open and watch a later journey open near reality instead of the timetable.
  Commit: `Learn segment times from ticket history and add demo replay`

- [ ] **4. It runs on the real domains, on your phone**
  Becomes usable: `basics.smartabeshackathon.tech` (Vercel) talking to `basicapi.smartabeshackathon.tech` (EC2) over HTTPS, installable as a PWA on Android, with live updates working through the proxy/tunnel.
  Why now: Push and the cross-subdomain cookie both need real HTTPS domains, and you've been bitten by cross-subdomain cookies before, so this risk lands before auth rather than at the end. Every later slice then gets checked on the phone.
  PRD ref: `prd.md > Screens and Layout` (phone-shaped)
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > External Services and Dependencies`, `spec.md > Decisions and Open Issues` (to verify early: packaging, Redis noeviction)
  Build: API build artifact (`bun build` bundle or `--compile`, whichever works with Prisma), systemd/pm2 unit, HTTPS via Cloudflare Tunnel or reverse proxy, CORS for the web origin; Vercel project rooted at `apps/web`; `app/manifest.ts`, icons and a minimal `public/sw.js`; `.env.example` files; a GitHub Actions or scp deploy path. You provide the EC2/DNS/Vercel access steps.
  Verify (mechanical): `curl https://basicapi.…/health` returns OK; the deployed web page loads stops; an SSE subscription to the deployed API survives 60s and receives a replay event sent to the deployed ingest URL; Lighthouse/Chrome reports the manifest as installable.
  Learner check: On your Android phone, open basics.smartabeshackathon.tech, install it, search College → Home, and send one replay event to the live API while watching the phone.
  Commit: `Deploy web to Vercel and API to EC2 with PWA manifest`

- [ ] **5. No direct bus? Take Route A, change at the market, wait 20 min**
  Becomes usable: Searching a pair with no direct route shows "1 change at [stop]" options with both legs and the predicted wait; making the first leg late shifts the wait or moves to a later second bus. "No buses connect these stops" (with swap hint) and "No more buses today" states appear when they should.
  Why now: The "harder than metro" pitch point. It's pure kernel logic over the predictions from slices 2–3, so it comes after learning but before the account features that don't depend on it.
  PRD ref: `prd.md > Route Options (Results)` (transfers, ordering), `prd.md > Journeys` (two legs, wait, re-plan), `prd.md > States and Boundaries` (no route, no more today)
  Spec ref: `spec.md > Planner (Route Options and Transfers)`, `spec.md > Live Updates (SSE Hub)` (reverse index across both legs' routes)
  Build: Rounds 1–2 patterns with the stop-early rule and per-pair cache; greedy leg chaining with the 5-min connection buffer and waits; `no_route`/`no_more_today` results; hub reverse index covers every route in a pattern; web leg view and empty states.
  Verify (mechanical): `bun test` for a transfer-only pair (1-change option with correct wait), late first leg → later second leg, ordering by arriveBy, no_route with reverseServed, no_more_today; a live `plan.watch` on a transfer pair updates after a replay event on leg A.
  Learner check: Search a pair that needs a change, read the two legs and the wait, then run a few late replay events on the first leg and watch the plan shift.
  Commit: `Add transfer planning with live connection waits`

- [ ] **6. Sign in, tap Notify me, get pinged at 45/30/15 min and when it slips**
  Becomes usable: Signed out, Notify me sends you to sign in and back with the alert registered; push notifications arrive on the phone at 45/30/15 min before be-at-stop-by and at every 10 min of lateness; blocked permission shows the "Notifications are blocked" message.
  Why now: Needs real HTTPS and the cookie setup from slice 4, and predictions that move (slices 2–3) to reschedule against.
  PRD ref: `prd.md > The Core Journey` (steps 6–7), `prd.md > Notifications` (Notify me, countdown, delay alerts), `prd.md > Accounts`
  Spec ref: `spec.md > Auth`, `spec.md > Alerts and Notifications`, `spec.md > tRPC Router` (`alerts.*`, `push.*`), `spec.md > Cross-subdomain config`, `spec.md > Important Failure Modes` (push denied)
  Build: Better Auth (email + password, Prisma adapter) on the API, tRPC session context and `protectedProcedure`; `/sign-in` with `next` + pending action; `push_subscription` and `alert` tables; `push.register`, `alerts.create/cancel/mine`; BullMQ queue + in-process worker (`ROLE`), Schedule/Reschedule/delay-bucket logic after each ingest batch; `sw.js` push + notificationclick; Notify me ghost button.
  Verify (mechanical): `bun test` for Schedule (passed thresholds skipped, ids `alert:{id}:{T}`), reschedule on a moved prediction and delay bucket crossing; on the deployed domains, sign-in sets a cookie that a following tRPC call accepts (cross-subdomain check); replay at `--speed` produces the 45/30/15 and a "10 mins late" job that the worker sends successfully (web-push 201).
  Learner check: On the phone, signed out, tap Notify me on a journey, sign up, come back, then run the replay toward your stop and watch the notifications arrive.
  Commit: `Add sign-in and push alerts for journeys`

- [ ] **7. Save "College → Home" and get the same alerts every day**
  Becomes usable: Save next to Notify me stores a named commute; tomorrow's journey at the same departure gets its alerts with no action; My commutes lists them and removing one stops its alerts.
  Why now: Builds directly on slice 6's alert machinery; it's the last product feature and the smallest.
  PRD ref: `prd.md > Notifications` (saved commutes, My commutes)
  Spec ref: `spec.md > Alerts and Notifications` (saved commutes, repeatable job), `spec.md > tRPC Router` (`commutes.*`), `spec.md > Web App Screens` (`/commutes`)
  Build: `commute` table; `commutes.save/remove/list`; 03:00 IST repeatable job plus boot pass creating today's alerts; cancel pending jobs on remove; Save button and `/commutes` page linked from Search when signed in.
  Verify (mechanical): `bun test` for the daily-alert creation against a given service date; manually triggering the repeatable job creates today's alert and schedules its jobs; removing the commute removes those jobs from Redis.
  Learner check: Save a commute, open My commutes, trigger the daily job (I'll give you the one-liner) and confirm alerts are scheduled, then remove it and confirm they're gone.
  Commit: `Add saved commutes with daily recurring alerts`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1 (UI round 1 on Search/Results/Journeys)
  Feedback (deferred to the next UI round by the learner's choice):
  - [ ] Journey row is ambiguous: "Be at your stop by 1:38" next to "There by 2:33" read as a 1-hour wait. Name both stops ("Bus at ABES College ~1:43 · be there by 1:38" / "Reaches Mohan Nagar ~2:33") and show the bus estimate beside the buffered time.
  - [ ] A never-reported, past-due bus reads as a contradiction ("not started · expected 12:00" next to 1:38). Decide: show honestly ("was due 12:00, no report yet") or hide once past due. Open product decision for the learner.
- [ ] Kernel checkpoint — after slice 3: watch the demo scenario self-correct; UI round 2
- [ ] On-phone checkpoint — after slice 5: deployed app with transfers on Android; UI round 3
- [ ] Final kick-the-tires exploration and feedback completed (UI round 4)

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

- Dropped Hono; the API uses `Bun.serve` routes with tRPC's fetch adapter and a small `withCors` helper — all three handlers already speak `Request`/`Response`, and the learner prefers no extra deps unless necessary.
- Dropped `ioredis` as a direct dependency — BullMQ bundles its own Redis client, so it was redundant.
- A journey that never reported is shown (overdue-clamped to now) until its expected time at X is 120 min past, then hidden — the spec defined "passed" only for active trips; 120 min matches the trip-resolution window, after which no event can start it. Open for the learner at checkpoint 1.
- `no_route` / `no_more_today` states built in slice 1 for direct routes (planner needed an answer for them); slice 5 extends them to transfers.
- API dev script runs from the repo root (`--env-file=apps/api/.env`) so `bun --watch` also reloads on `packages/*` edits.
- Architecture rule from the learner: types live only in `types/` folders (`src/types/` in core, db, api; `types/` in web, except component Props), interfaces over type aliases (unions/derived aliases stay `type`). `@app/api` now exports only its types; `@app/core/types` is the shared type entry.
- Trip resolution gained a fifth outcome, `stale`: an event older than the active trip's anchor is stored against that trip but moves nothing. Without it, an out-of-order event at an earlier stop fell through to "start a trip" and could wrongly start the bus's return journey.
- Ingest's signature/dedupe/flush checks are pure tests in `packages/core/test/resolve.test.ts` (no test database); the HTTP path is verified live with the replay script. `apps/api/test/` stays empty for now.
- The web app reads only `plan.watch` (the first SSE message is the first paint); `plan.search` stays as a plain query for scripts and debugging.
- `--speed N` runs ticket times on the same fast clock (spec said `occurredAt` stays real time). With real timestamps a sped-up run produces seconds-long segments that the outlier band rejects, so rehearsal taught nothing; on the fast clock it learns realistic times. Rehearsal data still must be wiped before recording.
- The demo narrates from a rider at Raj Nagar → Mohan Nagar by default (`--from/--to`). From ABES College, the first stop, the bus is "passed" the moment it leaves, so the first journey's drift was invisible; College → Home still shows the next journey opening corrected.
- `db:reset-learning` clears the database only; the API keeps learned times and trips in memory until it restarts. Reset, then restart the API, before a recording.
- Learning adopts a permanent change: 3 same-side outliers in a row become the new normal (spec > Learning). The long-run tests the learner asked for exposed that a >3× lasting slowdown (road closure) was rejected forever; `learn-long.test.ts` now covers normal days, congestion + outliers, and a closure.
