---
doc: spec
status: approved
---

# On the way: Technical Spec

## How This Works, In Plain Language
There are two deployables in one Bun workspace.

- **The API** (`apps/api`, a Bun process on EC2 at `basicapi.smartabeshackathon.tech`) is the brain:
  - It receives **signed ticket events** ("bus B was at stop S at time T") from conductors' devices. For the demo, a replay script plays the conductors.
  - It works out which **trip** each event belongs to.
  - It **learns** how long each stop-to-stop road segment really takes.
  - It **predicts** when every bus will reach every remaining stop.
  - It **pushes** fresh results to riders over a live SSE stream.
  - Through a BullMQ queue on Redis, it sends the **push notifications** (45/30/15-min countdown, delay alerts).
  - Postgres keeps everything.
  - The network (stops, routes, timetables, learned times, live trip positions) is also held **in memory**, so answering a rider costs no database query.
- **The web app** (`apps/web`, Next.js on Vercel at `basics.smartabeshackathon.tech`) is what the rider holds: a phone-shaped, installable PWA with From → To search, the route options, and the journeys with live times. It talks to the API through tRPC, with typed queries, mutations and one live subscription. A service worker receives the push notifications.

**Why this shape:**
- The prediction engine needs a long-running process: in-memory state, open SSE connections, a queue worker. Vercel's serverless functions are the wrong home for that, so the API runs on your EC2.
- Next.js on Vercel gets painless hosting and HTTPS.
- Both live under `smartabeshackathon.tech`, so the browser treats them as the same site and login cookies just work.
- The maths (learning, prediction, transfer planning) lives in a pure TypeScript package with no framework in it (`packages/core`), so it can be tested and benchmarked on its own.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Rider opens the app.** Next.js serves the Search screen. Tapping From or To opens a full-screen search; `stops.search` (tRPC query, debounced as they type) returns up to 8 fuzzy-ranked stops from the API's in-memory network.
2. **Rider picks College → Home and taps Search.** The web app opens the `plan.watch({ from, to })` **tRPC subscription** (SSE). The API's planner (`packages/core/plan`):
   - finds the route patterns connecting the two stops (direct first, then 1 change, then 2);
   - attaches today's catchable journeys to each, with predicted times;
   - sends the first result immediately.
3. **Results and Journeys render from that one stream.** Results shows one row per option (based on its next catchable journey). Tapping a row shows that option's journeys, already in the same payload.
4. **A conductor cuts a ticket** (in the demo, the replay script sends a signed event). `POST /ingest/events`:
   - verifies the HMAC signature;
   - dedupes on `(emitter, idempotency_key)`;
   - resolves the trip;
   - advances the trip and updates the learned segment times, all in one DB transaction, then the in-memory state.
5. **The SSE hub** recomputes results only for the subscribed (from, to) pairs that the updated trip's route touches, in microseconds, in memory. It pushes them down each open stream, and the rider's rows change with no refresh.
6. **Rider taps Notify me.**
   - **Signed out:** the web app routes to Sign in (Better Auth), then returns and registers.
   - **Signed in:** the browser grants notification permission, the push subscription is saved (`push.register`), and `alerts.create` stores an alert and schedules **BullMQ delayed jobs** for the 45/30/15-min marks.
7. **Each later ticket event** that moves this trip's prediction **reschedules** those jobs. When lateness crosses a 10-min multiple, a delay job runs immediately. The worker sends the Web Push message, and the phone shows it.

## Stack
The learner chose the stack, and it is their usual one. Versions are "latest stable at build time". The ⚠️ items need verifying in the first build step.

| Piece | Choice | Docs |
|---|---|---|
| Workspace / runtime | **Bun** workspaces (learner's choice, for separation of concerns and later service splits). The API runs on the Bun runtime. | https://bun.sh/docs/install/workspaces |
| Frontend | **Next.js** (App Router), React, deployed on Vercel. Learner's go-to. | https://nextjs.org/docs · https://vercel.com/docs/monorepos |
| UI | **Tailwind + shadcn/ui** | https://ui.shadcn.com |
| Client data | **TanStack Query** via `@trpc/tanstack-react-query` | https://tanstack.com/query/latest · https://trpc.io/docs/client/tanstack-react-query/setup |
| API layer | **tRPC v11**: queries, mutations and SSE subscriptions (`httpSubscriptionLink`) | https://trpc.io/docs/server/subscriptions |
| HTTP server | **`Bun.serve` with built-in `routes`**, no framework: tRPC via its fetch adapter (`fetchRequestHandler`), Better Auth's `auth.handler(req)`, and the raw ingest route. A small `withCors` helper handles credentialed CORS and preflight. Learner's rule: no extra deps unless necessary. | https://bun.sh/docs/api/http · https://trpc.io/docs/server/adapters/fetch |
| Validation | **Zod**: tRPC inputs, the ingest body, env | https://zod.dev |
| Auth | **Better Auth**, email + password, on the API (see Decisions) | https://www.better-auth.com/docs |
| DB | **PostgreSQL** (external, learner-provided) via **Prisma** | https://www.prisma.io/docs |
| Queue | **BullMQ** on **Redis** (external, learner-provided) | https://docs.bullmq.io |
| Push | **Web Push** (VAPID) via the `web-push` npm library, plus a service worker | https://github.com/web-push-libs/web-push · https://developer.mozilla.org/en-US/docs/Web/API/Push_API |
| Tests | `bun test` | https://bun.sh/docs/cli/test |

⚠️ **Verify early (build step 1):**
- Prisma's current major works under the Bun runtime. Newer Prisma generates a TS client with a `pg` driver adapter; confirm the generator and adapter setup.
- `web-push` works under Bun (it uses Node `crypto`).
- BullMQ/ioredis run under Bun.
- The tRPC SSE subscription survives `Bun.serve`'s default 10s `idleTimeout`. Set `idleTimeout: 0` on the server, or rely on tRPC's SSE ping (enable `sse.ping` at ~15s); do both.

If any of these fail under Bun, the fallback is to run `apps/api` on Node with `bun` still as the package manager. Nothing else changes.

## Where It Runs and How Someone Tries It

### Environments
- **Web:** Vercel, project root `apps/web`. Custom domain `basics.smartabeshackathon.tech` (CNAME to Vercel). HTTPS is automatic.
- **API:** EC2 at `basicapi.smartabeshackathon.tech`. Learner's flow: a GitHub Actions build delivers a prebuilt artifact (or a local build is scp'd over), run as a long-lived process (systemd/pm2). **No Docker.** HTTPS comes from a Cloudflare Tunnel if the domain's DNS is on Cloudflare; otherwise from an A record plus a reverse proxy with a cert. The existing site on the apex is untouched.
- **Postgres and Redis:** external services the learner provides (`DATABASE_URL`, `REDIS_URL`).

### Cross-subdomain config
The two subdomains are the same site, so cookies work as normal first-party cookies.
- API CORS: origin exactly `https://basics.smartabeshackathon.tech`, `credentials: true`.
- Better Auth: `baseURL = https://basicapi.smartabeshackathon.tech`, `trustedOrigins = [WEB_ORIGIN]`. The cookie stays `SameSite=Lax`, `Secure`.
- tRPC client: `fetch` with `credentials: 'include'`. The SSE link uses `withCredentials: true`.
- **Cookie scope.** The web app never reads the session cookie itself: every auth call goes to `basicapi.`, so a host-only cookie on `basicapi.` is enough. If any Next.js server code (middleware, server components) ever needs the session on `basics.`, enable Better Auth's `advanced.crossSubDomainCookies` with `domain: "smartabeshackathon.tech"`. The learner hit `www.*` → `server.*` cookie issues before, so **sign-in across the two subdomains is verified on the real domains in the auth build step**, not assumed.

### Env vars
`apps/api/.env`:
- `DATABASE_URL`, `REDIS_URL`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `TZ_SERVICE=Asia/Kolkata`

`apps/web/.env`:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

An `.env.example` is committed for each.

### Running it
```
bun install
bun run db:migrate && bun run db:seed     # schema + demo network (prints emitter secrets to scripts/replay/.env)
bun run dev                               # api on :4000, web on :3000
bun run replay -- --scenario demo         # plays the conductors (see Demo Replay Script)
bun test                                  # core maths + ingest tests
```
Push and service workers need HTTPS, so **phone testing and the recording use the deployed web app**. The API is reached either on EC2 or through the `basicapi.` tunnel pointed at the laptop; the frontend doesn't change either way.

### The demo recording
- Android Chrome on the phone, PWA installed. iOS supports Web Push only for installed PWAs, so Android is the safer recording device.
- Open **College → Home**, start `replay --scenario demo`, screen-record for about an hour, fast-forward in the edit.
- The script narrates in its console what to show (forged event rejected, dead-zone flush, second journey opening already corrected).

Submission still needs the video and the public repo. The live link is a bonus.

## Look and Feel
**Chosen in build (UI round 3):** "Fresh + coral". Bricolage Grotesque; warm neutral surfaces; one coral accent for the route line, route chip and main button; light and dark counterparts following the phone's setting; lateness as colored words ("Late by 4 min" red, "Early by 3 min"/"On time" green). Search is a From → To rail; Results is a vertical route card plus a Later buses list; Journeys is a "Be there by" hero and a stop timeline from the bus's last-seen stop to the destination. Text is minimal, but every number keeps its unit. The notes below were the round-1 starting point.

Carried from `prd.md > Look and Feel`: functional, easy on the eyes, not generic, BlaBlaCar's From → To as the reference, refined over 3–4 rounds in build. A clean starting point for round 1:
- **Layout:** a single column, max width ~480px, centered on desktop, thumb-reachable primary actions. The Search screen is two stacked stop fields joined by a vertical line and a swap button on the right (BlaBlaCar), with a full-width Search button.
- **Times are the hero:** large `tabular-nums` figures for "be at your stop by" and "home by", secondary text for routes and "last seen".
- **Status colour carries meaning only:** on time / early is neutral or green, late is amber, 20+ late is red. Otherwise a calm neutral base with one accent.
- **Copy is plain and specific:** "12 min late", "last seen at Raj Nagar · 3 min ago", "not started · expected 4:05".
- shadcn primitives with custom tokens, so it doesn't look like default shadcn. Fonts and dark mode are decided during the iteration rounds.

## Components

### Network Model (in memory)
`packages/core/network`. On boot, the API loads stops, routes, route_stops, journeys, segments and segment stats from Postgres into memory:
- `routeStops[routeId]`: ordered stops with timetable offsets;
- `stopRoutes[stopId]`: (routeId, seq) pairs;
- `segment` lookup by `(from, to)`;
- the learned stats.

This is the in-memory form of the benchmarked `route_stop(stop_id, route_id, seq)` index. It is reloaded only on restart; the network is seeded and static during a run.
PRD ref: `prd.md > Route Options (Results)`.

### Ingest
Implements `prd.md > Ticket Events (background, no UI)`.

**`POST /ingest/events`** (a raw `Bun.serve` route, not tRPC, because it's a device contract):
- **Headers:**
  - `X-Emitter-Id: <emitter id>`
  - `X-Timestamp: <unix seconds, send time>`
  - `X-Signature: hex(HMAC-SHA256(secret, X-Timestamp + "." + rawBody))`
- **Body:** `{ "events": [ { "idempotencyKey": "uuid", "stopId": "STOP_CODE", "occurredAt": "ISO-8601" } ] }`. A batch holds 1–100 events, so dead-zone flushes arrive as one request in device order.
- **Response:** `200 { "accepted": n, "duplicates": n, "unassigned": n }` · `401` bad or missing signature, revoked emitter, or `X-Timestamp` more than 5 min from server time (send-time replay window; `occurredAt` can be hours old) · `400` schema.

**Steps:**
1. Verify the signature with constant-time compare. The emitter secret is read from `emitter.secret`.
2. Sort the batch by `occurredAt`.
3. For each event:
   - `INSERT … ON CONFLICT (emitter_id, idempotency_key) DO NOTHING`; a duplicate stops here.
   - Resolve the trip (below).
   - Apply it to the trip (Trip State).
   - Learn (Learning).

   All of this runs in one transaction per batch.
4. After commit, update in-memory state and notify the SSE Hub and the Alert Scheduler.

Forged or revoked events never reach step 3, so predictions can't change.

### Trip Resolution
The device sends only stop and time, so the server decides the trip. `packages/core/resolve`, inputs: the emitter's bus, the event, and that bus's journeys and trips for the service day (Asia/Kolkata):
1. **Active trip continues** if this bus has an active trip whose route has this stop at `seq > last_seq`. Take the smallest such seq ahead.
2. **Same stop again** (more tickets at the stop the bus was last seen at): update `last_seen_at` only.
3. **Otherwise start a trip:**
   - Candidates are this bus's journeys whose route contains the stop and whose trip for today isn't completed.
   - Pick the one whose **expected time at that stop** is closest to `occurredAt`, within ±120 min.
   - Create or activate the trip instance and mark any previous active trip of the bus `completed`.
4. **No match:** store the event with `trip_id = null`. It counts as `unassigned` and has no effect.

A trip completes when it reaches its last stop or the bus starts another trip. At a shared terminus (last stop of the up route = first of the down), the first event completes the up trip. Later tickets there match rule 3 and start the down trip.

### Trip State
For each trip: `status` (scheduled → active → completed), `last_seq`, `last_stop_id`, `anchor_at` (the **first** event time at `last_seq`), `last_seen_at` (latest event at any stop).
- **Forward only:** an event whose resolved `seq ≤ last_seq` (except rule 2) or whose `occurredAt < anchor_at` is stored but doesn't move the trip.
- Batches are applied in `occurredAt` order, so a dead-zone flush yields the same state as live delivery (`prd.md > Ticket Events` criterion 3).

### Learning (Segment Stats)
Implements `prd.md > Lateness and Predictions` (self-correction). `packages/core/learn`.
- **The sample:** when a trip advances from stop i (anchor tᵢ) to stop j (first event tⱼ), the elapsed time `tⱼ − tᵢ` covers the segments i→…→j. Tickets aren't cut at every stop, so when j > i+1 the time is **split across the skipped segments in proportion to their current typical times**. Dwell time at a stop is part of the following segment.
- **Time-of-day buckets:** the bucket comes from when the bus entered the segment.
  - `am_peak` 07:00–10:00
  - `midday` 10:00–16:00
  - `pm_peak` 16:00–20:00
  - `off` the rest

  Each `(segment, bucket)` row keeps `typical_sec` and `samples`. An `all` row is updated alongside it on every sample.
- **The update rule** (running mean, then EWMA): `α = max(1/n, 0.2)`, where n counts samples including this one. `typical ← typical + α·(sample − typical)`.
  - **The first real sample replaces the timetable prior outright.** One real observation beats a schedule we know is wrong.
  - The first five samples average equally, after which recent trips weigh 20%.

  This makes "a fresh journey starts near reality after two or three replayed journeys" true by construction.
- **Outliers:** once a row has ≥3 samples, reject samples outside **[0.33×, 3×] typical**. Before that, check against the timetable prior with the same bounds. Rejected samples are counted but ignored.
- **Permanent change:** 3 outliers in a row on the same side (all slower or all faster) mean the road itself changed (closure, diversion). Their mean becomes the new typical with `samples = 1`. A normal sample in between, or an outlier on the other side, resets the streak. Stored as `pending_count` / `pending_mean_sec`.
- **Lookup (`typical(segment, bucket)`):**
  1. the bucket row if it has ≥3 samples;
  2. else the `all` row if it has ≥1 sample;
  3. else the **timetable prior**: the route's offset difference for that segment.

  Segments are shared, so a road learned on Route A helps Route C.

### Prediction
Implements `prd.md > Lateness and Predictions` and `prd.md > Journeys`. `packages/core/predict`. All times are server-side instants.

For a trip on journey J (route R, departure D):
- **Expected at stop k:** `D + Σ typical(seg)` for segments 0→k, with each bucket chosen by the expected time of entering that segment. This is what this journey usually does. With no history it equals the timetable.
- **Estimated at stop k:**
  - **Active:** `anchor_at + Σ typical(seg)` for last_seq→k.
  - **Not started:** the expected time.
  - **Overdue clamp:** if the next stop's estimate is already in the past with no event there, the remaining chain shifts so the next stop is `now`. A silent bus drifts later instead of showing a time in the past.
- **Late (minutes):** `round((estimated_X − expected_X) / 60)`. Positive means late, negative means early, and |late| < 2 counts as on time.
- **Buffer (rider's favour):** "be at your stop by" = `estimated_X − 5 min`. "Arrive by" = `estimated_Y + 5 min`.
- **Passed:** a trip with `last_seq ≥ seq(X)` has passed X and is hidden.
- **Never reported:** a journey with no events is hidden once its bus has started a later journey, and once its expected time at X has passed (the rider can't act on "might still come"). Until then a silent bus is overdue-clamped forward.

### Planner (Route Options and Transfers)
Implements `prd.md > Route Options (Results)` and the transfer parts of `prd.md > Journeys`. `packages/core/plan`. It works in RAPTOR-style rounds, where round k means k changes, max 2.
1. **Patterns:**
   - **Round 0:** every route where X comes before Y.
   - **Round 1:** route pairs (A, B) with a change stop M where X is before M on A and M is before Y on B.
   - **Round 2:** likewise with two change stops.

   Stop exploring a round once a lower round found patterns, unless the higher round arrives earlier. Patterns are cached per (X, Y), since the network is static.
2. **Journeys per pattern:**
   - For each of today's trips on the first leg that hasn't passed X, chain the legs greedily.
   - The next leg is the earliest trip on B whose estimated time at M is **≥ leg A's estimated arrival at M + 5 min** (connection buffer).
   - Each leg records its predicted wait at M = `est_B(M) − est_A(M)`.
   - If leg A slips past the connection, the next recompute naturally picks a later B trip.
3. **Options:** each pattern becomes one option whose headline is its earliest catchable journey:
   - `totalMin = (arriveBy_Y − now)`;
   - `arriveBy`;
   - routes;
   - `changes` (omitted when 0);
   - the change stop names.

   Options are sorted by `arriveBy`.
4. **Empty cases** (`prd.md > States and Boundaries`):
   - No pattern: `{ kind: "no_route", reverseServed: boolean }`.
   - Journeys cover a rolling **24 hours** (today's and tomorrow's service days), so late at night tomorrow's buses follow on, labelled "Tomorrow". `"no_more_today"` remains only for a route with nothing in the next 24 hours. Connections may come from the next service day.

Output shape (Zod schema in `packages/core/schemas.ts`, shared by API and web):
```ts
PlanResult = { kind: "ok", generatedAt, options: Option[] } | { kind: "no_route", reverseServed } | { kind: "no_more_today", tomorrowFirst? }
Option = { id, routes: string[], changes: number, changeStops: string[], next: JourneyView, journeys: JourneyView[] }
JourneyView = { legs: Leg[], beAtStopBy, arriveBy, lateMin, status: "not_started" | "active", lastSeen?: { stopName, at } , expectedX, tripIds }
Leg = { routeName, tripId, boardStop, boardEst, alightStop, alightEst, waitMinBefore?: number }
```

### Live Updates (SSE Hub)
Implements `prd.md > Route Options (Results)` (live criterion) and the Core Journey step 5.
- `plan.watch({ from, to })` is a tRPC subscription (async generator) over SSE.
- The hub keeps `Map<pairKey, Set<subscriber>>` and a reverse index `routeId → pairKeys` built from each pair's patterns.
- **On a trip update:** recompute each affected pair once and yield to all its subscribers.
- **A 30s tick** also recomputes active pairs, so the overdue clamp, passed journeys and "x min ago" stay honest without events. The client also re-renders relative times locally every 30s.
- Reads never touch Postgres. This is the "scales with buses, not riders" property.
- The SSE ping runs every 15s and the server `idleTimeout` is 0.

### Alerts and Notifications
**As built (revised in `5-build`):** no accounts and no BullMQ. A **device** is a browser's push subscription (`device`: endpoint, keys, sha256 of a secret the browser keeps in localStorage; `alerts.register` returns `{deviceId, secret}`). `alerts.create/cancel/mine` take those credentials. Open `alert` rows are held in memory by `AlertScheduler` with one timer per countdown mark still ahead (45/30/15 min before "be there by", `core/alerts.ts`); each ingest batch re-arms alerts on the changed routes, a 60 s pass catches silent-bus drift, and boot re-arms everything from Postgres. Delay pushes fire when lateness crosses a new 10-min step. A 404/410 from the push service deletes the device. An alert closes when its bus passes the rider's stop. The notes below are the original BullMQ/sign-in design.

Implements `prd.md > Notifications` and `prd.md > Accounts`.
- **Push registration:**
  - The web app registers `public/sw.js`.
  - On the first Notify me or Save, it asks for permission, subscribes with the VAPID public key, and calls `push.register({ endpoint, keys })`.
  - The API stores it per user. One user can have several devices.
- **Notify me:** `alerts.create({ tripId, journeyId, serviceDate, fromStopId, toStopId })` creates an `alert` row, then runs Schedule.
- **Schedule(alert):**
  1. Compute `beAtStopBy` for the trip at the from-stop.
  2. For each threshold T in [45, 30, 15], `fireAt = beAtStopBy − T min`. If `fireAt > now`, upsert a BullMQ delayed job with id `alert:{alertId}:{T}`. Already-passed thresholds are skipped (`prd.md > Notifications`: only the alerts still ahead).
  3. Thresholds already sent are tracked in `alert.sent_thresholds` and never re-sent.
- **Reschedule:** after each ingest batch, for every alert on an updated trip, remove the old job and add a new one at the new delay. These jobs carry no state, so moving them is safe.
- **Delay alerts:** after each update, let `bucket = floor(late / 10)`. If `bucket ≥ 1` and `bucket > alert.last_late_bucket`, enqueue an immediate job: "{late} mins late, now arriving at {beAtStopBy}". The time shown is the buffered be-at-stop time, matching what the rider sees; the PRD's example wording is kept. Then store the bucket.
- **Countdown text:** "Bus is {T} min from {stop}. Be at your stop by {time}."
- **Worker:** the BullMQ `Worker` runs in the API process (behind the `ROLE` env, so it can split into its own process later). It loads the alert and the user's push subscriptions and sends via `web-push`. A `404/410` from the push service deletes that subscription.
- **Saved commutes (recurring):**
  - `commutes.save({ name, journeyId, fromStopId, toStopId })`.
  - A BullMQ **repeatable job** at 03:00 Asia/Kolkata creates today's `alert` for every commute, against that journey's trip instance for the day ("same time tomorrow"), and runs Schedule. The job also runs on boot, so a restart mid-day still covers today.
  - `commutes.remove(id)` deletes the commute and cancels its pending alert jobs.
- Alerts for completed or passed trips are closed and their jobs removed.

### Auth
Implements `prd.md > Accounts` and the Sign in screen.
- Better Auth runs on the API at `/api/auth/*`, with **email + password** and the Prisma adapter, so its `user`, `session`, `account` and `verification` tables live in `packages/db`.
- tRPC context reads the session from cookies. `protectedProcedure` guards `alerts.*`, `commutes.*` and `push.*`. Everything else is public.
- The web app uses the Better Auth React client (`createAuthClient({ baseURL: NEXT_PUBLIC_API_URL })`).
- **Pending action:** Sign in receives a `next` URL plus the pending action (`notify:{tripId}` or `save:{journeyId}`) in the query string, completes it after sign-in, and returns the rider to where they were.

### tRPC Router
`apps/api/src/trpc/`:

| Procedure | Kind | Auth | Serves |
|---|---|---|---|
| `stops.search({q, limit?})` | query | public | Stop Search: ≤8 ranked fuzzy matches as the rider types (uFuzzy in memory) |
| `stops.byIds({ids})` | query | public | stop names for ids already in the URL |
| `plan.search({from,to})` | query | public | first paint and fallback |
| `plan.watch({from,to})` | subscription (SSE) | public | Results and Journeys live |
| `line.watch({routeId, journeyId?})` | subscription (SSE) | public | Line view live |
| `alerts.create` / `alerts.cancel` / `alerts.mine` | mutation / mutation / query | user | Notify me |
| `commutes.save` / `commutes.remove` / `commutes.list` | mutation / mutation / query | user | Saved commutes, My commutes |
| `push.register` / `push.unregister` | mutation | user | Web Push |

`apps/web` imports `type AppRouter` from `@app/api` (type-only), so it ships no server code.

### Web App Screens
Implements `prd.md > Screens and Layout`. Pages are client components (`"use client"`) using tRPC and TanStack Query.

| Route | Screen | Notes |
|---|---|---|
| `/` | Search | From/To pickers (shadcn `Command` in a sheet, type to filter), swap, Search disabled until both are set and differ. Links to My commutes when signed in. |
| `/plan?from=&to=` | Results | Subscribes to `plan.watch`. Rows show total min, "home by", routes, "1 change at M". Empty states as in the PRD. |
| `/plan/[optionId]?from=&to=` | Journeys | Same subscription. Journey rows show be-at-stop-by, late badge, arrive-by, last seen / not started, transfer legs with the wait, and Notify me (ghost) plus Save. |
| `/sign-in` | Sign in | Email and password, sign up / sign in toggle, handles `next` and the pending action. |
| `/line/[routeId]?journey=&board=&alight=` | Line view | One bus line end to end (`line.watch`, SSE): every stop, live buses on it with lateness, the rider's bus's time at each stop, their ride drawn bold and the rest faded. Reached from the route chips on Journeys. |
| `/commutes` | My commutes | List with name, route, departure, and remove. |

PWA: `app/manifest.ts`, icons, `public/sw.js` (push + notificationclick → open `/plan?...`).

### Demo Replay Script
Implements `prd.md > Demo Replay (script, not product)`. `scripts/replay`:
- It's a Bun script that is just another emitter. It signs with the seeded secrets exactly like a real device, so it proves the device contract.
- **Ground truth:** a `reality` table of true segment times per route. Timetable offsets are seeded about 15 min too optimistic across each route, and reality adds ±10% noise.
- **`--scenario demo`:** runs two or three journeys of the College → Home route back to back in **real time** (about 20 events in about an hour). The video fast-forwards, and the timestamps stay honest.
  - Partway through, it holds about 4 events as a **dead zone** and flushes them as one batch.
  - It sends one **forged** event (wrong key), which is rejected (console shows 401).
  - It re-sends one event, counted as a duplicate.
  - It logs each beat for narration.
- **`--speed N`:** compresses wall-clock waits for rehearsal only. Ticket times run on the same fast clock, so the API learns realistic segment times from a rehearsal. Wipe them before recording with `bun run db:reset-learning`, then restart the API (it holds learned state in memory).
- **`--from/--to`:** the rider whose view is narrated, default Raj Nagar → Mohan Nagar (mid-route, so the first journey's drift is visible before the bus passes).

## Data Model
`packages/db/prisma/schema.prisma`. The **event log is the source of truth**; trip state and segment stats are derived caches of it. IDs are `cuid` strings, except that stops and routes use readable codes for seeding and the replay. Timestamps are `timestamptz`, and service dates are computed in Asia/Kolkata.

| Table | Key columns | Notes |
|---|---|---|
| `stop` | `id` (code), `name` | |
| `route` | `id` (code), `name`, `reverse_of_id?` | one per direction |
| `route_stop` | `route_id, seq, stop_id, offset_min` | PK (route_id, seq). **Index (stop_id, route_id, seq)**. `offset_min` = timetable minutes from departure |
| `segment` | `id, from_stop_id, to_stop_id` | unique (from, to). Derived from consecutive route_stops at seed time |
| `segment_stat` | `segment_id, bucket, typical_sec, samples, rejected` | PK (segment_id, bucket). bucket ∈ am_peak, midday, pm_peak, off, all |
| `bus` | `id`, `reg_no` | |
| `emitter` | `id, bus_id, secret, revoked_at?` | secret stored as-is, not hashed, because HMAC verification needs it; encrypting it at rest is future scope |
| `journey` | `id, route_id, bus_id, departure_min` | the timetabled departure (minutes after midnight IST). Mandatory timetable (`prd.md > Product Decisions`) |
| `trip` | `id, journey_id, service_date, status, last_seq?, last_stop_id?, anchor_at?, last_seen_at?` | unique (journey_id, service_date). Created lazily |
| `ticket_event` | `id, emitter_id, idempotency_key, trip_id?, stop_id, occurred_at, received_at` | **append-only**, unique (emitter_id, idempotency_key), index (trip_id, occurred_at) |
| `user`, `session`, `account`, `verification` | Better Auth | generated by the Better Auth CLI |
| `push_subscription` | `id, user_id, endpoint (unique), p256dh, auth` | |
| `commute` | `id, user_id, name, journey_id, from_stop_id, to_stop_id` | recurring daily |
| `alert` | `id, user_id, trip_id, from_stop_id, to_stop_id, commute_id?, sent_thresholds int[], last_late_bucket, closed_at?` | one-time if `commute_id` is null |

**Where each piece of data lives:**
- **Network and learned stats:** Postgres, mirrored in API memory. Updated only by ingest. Survives restarts by reloading on boot.
- **Trip positions:** Postgres `trip` plus memory, updated by ingest. On restart they are reloaded, and can always be rebuilt by folding `ticket_event` in order.
- **Search (From/To):** the URL only, and not remembered (`prd.md > States and Boundaries`). Refresh or return keeps the URL.
- **Alerts, commutes, push subscriptions:** Postgres per user, plus jobs in Redis. Scheduled jobs survive API restarts in Redis, and a boot pass re-runs Schedule for open alerts to be safe.
- **Session:** a Better Auth httpOnly cookie on `basicapi.`, shared by same-site requests.

## File Structure
```
ai-basics/
├── package.json              # bun workspaces: apps/*, packages/*, scripts/*; root scripts dev/test/db:*/replay
├── bunfig.toml
├── tsconfig.base.json
├── .env.example → see apps/*/.env.example
├── apps/
│   ├── api/                  # Bun.serve: the long-running brain (EC2)
│   │   ├── src/
│   │   │   ├── index.ts      # boot: env, load network into memory, Bun.serve routes (idleTimeout 0), start worker
│   │   │   ├── cors.ts       # withCors: exact WEB_ORIGIN, credentials, OPTIONS preflight
│   │   │   ├── env.ts        # Zod-validated env
│   │   │   ├── state.ts      # in-memory network + trip states + stats (singleton)
│   │   │   ├── ingest/
│   │   │   │   ├── route.ts      # POST /ingest/events
│   │   │   │   ├── verify.ts     # HMAC + timestamp window + emitter secret decrypt
│   │   │   │   └── apply.ts      # tx: dedupe → resolve → trip state → learn
│   │   │   ├── hub.ts        # SSE pair subscriptions, reverse index, 30s tick
│   │   │   ├── alerts/
│   │   │   │   ├── schedule.ts   # schedule/reschedule/delay-bucket logic
│   │   │   │   ├── queue.ts      # BullMQ queue + repeatable commute job
│   │   │   │   ├── worker.ts     # BullMQ worker → web-push
│   │   │   │   └── push.ts       # web-push setup (VAPID)
│   │   │   ├── auth.ts       # Better Auth config (prisma adapter, trustedOrigins)
│   │   │   └── trpc/
│   │   │       ├── init.ts       # context (session), public/protected procedures
│   │   │       ├── router.ts     # AppRouter (exported type)
│   │   │       └── routers/      # stops.ts, plan.ts, alerts.ts, commutes.ts, push.ts
│   │   ├── test/             # ingest signature/dedupe/flush tests
│   │   └── .env.example
│   └── web/                  # Next.js PWA (Vercel)
│       ├── app/
│       │   ├── layout.tsx, manifest.ts, providers.tsx   # tRPC + Query + auth client providers
│       │   ├── page.tsx                  # Search
│       │   ├── plan/page.tsx             # Results
│       │   ├── plan/[optionId]/page.tsx  # Journeys
│       │   ├── sign-in/page.tsx
│       │   └── commutes/page.tsx
│       ├── components/       # stop-picker, option-row, journey-row, late-badge, legs, notify-button, ui/ (shadcn)
│       ├── lib/              # trpc.ts (links: httpBatchLink + httpSubscriptionLink), auth-client.ts, push.ts, time.ts
│       ├── public/sw.js      # push + notificationclick
│       └── .env.example
├── packages/
│   ├── core/                 # pure TS, no I/O: the kernel
│   │   ├── src/
│   │   │   ├── network.ts    # types + in-memory indexes
│   │   │   ├── resolve.ts    # event → trip
│   │   │   ├── learn.ts      # sample split, running-mean→EWMA, outliers, buckets
│   │   │   ├── predict.ts    # expected / estimated / late / buffer / overdue clamp
│   │   │   ├── plan.ts       # patterns by rounds, chaining, options
│   │   │   ├── schemas.ts    # Zod: PlanResult etc. + ingest body
│   │   │   └── time.ts       # IST service day, buckets
│   │   └── test/             # learn/predict/plan/resolve tests + bench
│   └── db/
│       ├── prisma/schema.prisma
│       ├── prisma/seed.ts    # demo network, timetables ~15 min optimistic, buses, emitters (prints secrets)
│       └── src/index.ts      # Prisma client export
├── scripts/
│   └── replay/               # demo conductor: reality table, scenarios, signer
└── devpost/                  # planning docs
```

## External Services and Dependencies
- **Postgres** (learner-provided). `DATABASE_URL`, Prisma migrations. Small data, any tier.
- **Redis** (learner-provided). `REDIS_URL`. BullMQ needs `maxmemory-policy noeviction`; check the provider allows it (https://docs.bullmq.io/guide/going-to-production).
- **Vercel** (free). Root directory `apps/web`, install `bun install` at the repo root, custom domain `basics.smartabeshackathon.tech`.
- **EC2** (existing). Runs `apps/api`, with HTTPS via Cloudflare Tunnel or a reverse proxy.
- **Web Push services** (FCM for Chrome, Mozilla autopush). No account needed. VAPID keys come from `bunx web-push generate-vapid-keys`. Payload ≤ 4KB JSON `{ title, body, url }`.
- **No paid APIs.** No maps, no geolocation.

## Important Failure Modes
- **SSE drops** (network, proxy timeout) → the tRPC subscription link reconnects automatically. Meanwhile rows keep their last values with a subtle "reconnecting…" marker, and on reconnect the first yield is a full fresh result.
- **A bus goes silent** (dead zone, device off) → the overdue clamp keeps estimates in the future. The row shows "last seen at X · 25 min ago" so the rider can judge (`prd.md > States and Boundaries`, stale bus). When the queued events flush, everything jumps to the truth.
- **Push permission denied, or no push support** (e.g. iOS not installed) → Notify me shows "Notifications are blocked on this device" with how to enable them. The alert isn't created, so there are no silent failures.
- **The API is unreachable** from the web app → Search shows "Can't reach live data right now" with a retry, never stale timetable numbers presented as live.

## What Was Simplified and Why
- **Network data is seeded via script** instead of an admin panel. The learner decided it's "just a UI wrapper over SQL statements" (`prd.md > Deferred From the POC`).
- **The conductor device is the replay script.** It uses the real signing contract, so a real device is a drop-in (`prd.md > Possible Later Enhancements`).
- **The in-memory hub and worker run in a single API instance**, instead of Redis pub/sub fan-out and separate worker processes. That's enough for a POC, and the split is mapped out in Future Architecture.
- **Email and password sign-in** instead of OAuth or magic links. Zero external setup. Better Auth adds providers with config only.
- **The network reloads only on restart.** Routes don't change mid-demo.

## Future Architecture (pitch section)
How this grows without a rewrite, each step a deploy change thanks to the workspace split:
1. **Ingest becomes its own service.** It is write-heavy, scales with buses, and publishes "trip updated" on Redis.
2. **The SSE hub fans out over Redis pub/sub**, so many API replicas behind a load balancer each serve their own riders. Reads still never touch Postgres.
3. **The worker becomes its own process** (`ROLE=worker`), already supported.
4. **Partitioning by region or depot:** the network is per-depot and fits in memory. `ticket_event` partitions by month.
5. **Real UPSRTC ticket machines** speak the same signed `POST /ingest/events`.

## Decisions and Open Issues

### Learner decisions
- **Bun workspace monorepo:** separation of concerns, so services can move to dedicated hosting later.
- **Next.js on Vercel for the web; a separate backend on EC2; tRPC between them.** "Next.js is not so easy to deploy" for long-running work, and Next.js is the go-to for the UI.
- **Usual stack:** Better Auth, Zod, shadcn, TanStack Query, Prisma, BullMQ, Postgres.
- **No Docker.** The API ships as a prebuilt artifact via GitHub Actions or scp to EC2.
- **Postgres and Redis are external.** Only the backend runs on the server.
- **Subdomains** `basics.` (web) and `basicapi.` (API) on smartabeshackathon.tech.
- **Nothing changes on the conductor's side.** Trips are resolved server-side, so the device sends stop and time only.

### Agent recommendations, for the learner to accept in review
1. **Learning rule:**
   - running mean, then EWMA (`α = max(1/n, 0.2)`), with the first real sample replacing the timetable;
   - outlier band 0.33×–3×;
   - four time-of-day buckets plus an `all` fallback, with a bucket used at ≥3 samples.
2. **Connection buffer:** a transfer is catchable if the next bus reaches M at least 5 min after the first bus arrives.
3. **Sign-in method:** email and password.
4. **Delay alert text uses the buffered "be at your stop by" time.**
5. ~~Hono as the API's HTTP layer~~ → replaced in `5-build` planning by plain `Bun.serve` routes (learner: "no need for additional deps unless necessary").

### Corrections to earlier docs
- `scope.md` listed `emitter.secret_hash`. HMAC verification needs the actual secret, so it is stored as-is, not hashed. (It was first encrypted at rest with AES-GCM; dropped during slice 6, see checklist Revisions.)
- `scope.md` listed `trip.last_seq/last_seen_at`; `anchor_at` was added (the first event at the current stop) so dwell doesn't skew the estimate.
- `scope.md` said "Admins must sign in"; with no admin panel, there are no admin accounts.

### Learning moment (one useful unknown)
None was raised directly. The profile flags ETA estimation as the possibly unfamiliar area. The **Learning** and **Prediction** sections above make it concrete:
- why the first real sample overrides the timetable;
- how a skipped-stop sample is split across segments;
- what the overdue clamp does when a bus goes quiet.

To be checked during build with `packages/core` tests that replay a 15-min-wrong timetable and assert the second journey's expected time lands within ~2 min of reality.

### To verify early in build
Bun compatibility: Prisma client and adapter, `web-push`, BullMQ; the tRPC SSE subscription under `Bun.serve`; whether the Redis provider allows `noeviction`; packaging `apps/api` as a prebuilt artifact (`bun build` bundle vs `--compile` with Prisma).

### Carried over
- ~~Product name~~ → **On the way** (decided in `5-build`).
- **Seed network:** a realistic small network (3–4 routes per direction, ~25 stops, one shared transfer stop). If you want, give the real stop names of your old commute and the demo uses them; otherwise placeholders.
