---
doc: prd
status: approved
---

# On the way: Product Requirements

A phone-first rider app that tells a day scholar when the next bus from stop X will get them to stop Y, using predictions learned from conductors' ticket events instead of a static timetable.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey
Source: `scope.md > The Core Loop`.

1. A rider (e.g. leaving college for home) opens the app. No greeting or onboarding: they land straight on the **From → To** search.
2. They pick a **From** stop and a **To** stop and tap **Search**.
3. They see **route options** (direct or with changes), sorted by **least total travel time**. Each shows total travel time including the wait, arrival time at Y, and number of changes (only if there are any).
4. They tap an option and see its **journeys, nearest first**. Each shows when the bus is predicted to reach their stop, how late or early it is, when it arrives at Y, and when it was last heard from.
5. Results **update live** as ticket events arrive. No refresh needed.
6. Optionally they tap **Notify me** on a journey. If signed in, alerts are registered. If not, they're asked to sign in first.
7. They get push alerts as the bus approaches (45 / 30 / 15 min) and if it slips (every 10 min of lateness).

**Success:** the rider knows, without trusting the timetable, how long until the bus reaches their stop, whether it's late, and when they'll get to Y. If they miss it, they know when the next one is.

## Screens and Layout
Phone-shaped (used at a stop or walking out of college). Platform (web/PWA vs native) is decided in `4-spec`.

1. **Search:** From and To stop pickers, a swap button, and Search. Modeled on BlaBlaCar's from/to screen.
2. **Results:** the list of route options for X → Y.
3. **Journeys:** the journeys for one option, nearest first, each with a **Notify me** ghost button.
4. **Sign in:** shown only when a signed-out rider taps Notify me or Save. Returns them to where they were.
5. **My commutes:** the signed-in rider's saved commutes, each removable.

There is no admin panel, no conductor screen and no simulator screen (see **Non-Goals**).

## Look and Feel
Functional first and easy on the eyes, but **not generic AI-app styling**. Reference: BlaBlaCar's From → To search. Visual details (colors, type, light/dark) are deliberately left open. The learner will refine the UI with the agent over **3–4 iteration rounds during `5-build`**, so the build should start clean and simple and expect revisions.

## Features and Behavior

### Stop Search
- The rider picks From and To from the known stops (type to filter by name).
- Swap reverses From and To.
- [ ] Typing part of a stop name filters the list to matching stops.
- [ ] Search is disabled until both stops are chosen and they differ.

### Route Options (Results)
Source: `scope.md > The POC Boundary` (X → Y lookup, transfers).
- Any route where X comes before Y is a **direct** option. When no single route connects them, options with **changes** (metro-style) are shown.
- Each row is based on the **next journey the rider can actually catch**, not on route averages.
- Each row shows **total travel time from now, including the wait** (e.g. "55 min"), **arrival time at Y** ("home by 4:40"), the **route(s)**, and the **number of changes**, which is left out when zero.
- Sorted by least total travel time (equivalently, earliest arrival at Y).
- [ ] Searching a pair served by one route shows it with no "changes" label.
- [ ] Searching a pair with no direct route shows a transfer option labeled "1 change at [stop]".
- [ ] Rows are ordered by arrival time at Y, earliest first.
- [ ] When a ticket event changes a prediction, the affected row's times update without a refresh.

### Journeys
- Tapping an option lists its journeys for the rest of the day, **nearest first**. Journeys that have already passed X are hidden.
- **Each journey row shows:**
  - **Predicted arrival at X** (the prediction, never the raw timetable), e.g. "reaches your stop ~2:47".
  - **Late / early / on time**, e.g. "12 min late".
  - **Arrival at Y.**
  - **Last heard from**, e.g. "last seen at Raj Nagar, 3 min ago". A journey with no events yet shows "not started · expected 4:05".
- **Transfer options show each journey as two legs**, with the predicted wait at the change point: "Route A 3:10 → Market 3:40 · wait 20 min · Route B 4:00 → home 4:40". If the first leg runs late enough to miss the connection, the plan shifts to the next catchable second leg.
- [ ] A journey whose bus has sent events shows a predicted time that differs from the timetable when history says it should.
- [ ] A journey with no events shows "not started" with its expected time.
- [ ] A transfer journey shows both legs and the wait at the change stop.
- [ ] Making the first leg late (via events) visibly changes the wait or switches to a later second leg.

### Lateness and Predictions
Source: `scope.md > The Unique Kernel`.
- **Expected:** what this journey usually does: timetable departure plus learned typical travel time to the stop. With no history, it's the timetable.
- **Estimated:** the live prediction from the bus's most recent ticket event and learned stop-to-stop times.
- **Late / early = estimated − expected.** "Late" means late versus what this route really does, not versus the timetable.
- Predictions improve as journeys run. Unusual one-off trips shouldn't skew them (method decided in `4-spec`).
- **Safety buffer (5 min), always in the rider's favor.** The goal is that the rider always reaches the stop before the bus.
  - At X, the screen shows "**be at your stop by [prediction − 5]**", and countdown alerts are timed to that.
  - At Y, arrival is shown as "**[prediction + 5]**", so the rider is never promised too early an arrival.
- [ ] The "be at your stop by" time is 5 min earlier than the raw prediction, and the arrival at Y is 5 min later.
- [ ] After two or three replayed journeys on a route whose timetable is ~15 min wrong, a fresh journey's expected time starts near reality instead of the timetable.

### Notifications
- **Notify me** (ghost button) on a journey row.
  - **Signed in:** alerts are registered for that journey at the rider's From stop, with brief confirmation.
  - **Signed out:** a prompt to sign in. After signing in, the alert is registered.
- **Countdown alerts** at **45, 30 and 15 min** before the bus is predicted to reach the rider's stop.
- **Delay alerts** each time lateness crosses a **10-min multiple**: "10 mins late, now arriving at 4:10 PM".
- Delivered as **push notifications** to the rider's device (works for web via Web Push and for native apps).
- Subscribing when the bus is already closer than a threshold sends only the alerts still ahead.
- **Saved commutes (recurring alerts):** a signed-in rider can save a journey under a name (e.g. "College → Home"). It repeats the same alerts **every day for the journey at that same timetabled departure** ("same time tomorrow"), until removed. It recurs daily with no weekday filter, and saving happens from the journey row next to Notify me.
- **My commutes:** a simple list of saved commutes (name, route, departure time) where each one can be removed (minimal, reached from Search).
- [ ] Signed out → Notify me shows the sign-in prompt, and after sign-in the alert is active.
- [ ] A saved commute sends alerts for tomorrow's journey at the same departure time without the rider doing anything.
- [ ] Removing a saved commute stops its future alerts.
- [ ] With the bus replayed toward the stop, alerts arrive at 45/30/15 min.
- [ ] Making the bus 10+ min late sends "10 mins late, now arriving at [time]".

### Accounts
Source: `scope.md > The POC Boundary` (Accounts).
- Signing in is **optional**. Everything except notifications works signed out.
- Signing in enables **one-time alerts** (Notify me) and **saved commutes**: named, recurring alerts such as "College → Home" (recurrence rule in **Open Questions**).

### Ticket Events (background, no UI)
Source: `scope.md > The POC Boundary` (Emitters, Dead-zone handling, Ingestion).
- Conductors see **no change**. The ticket device reports "this bus is at stop Y, at time T" in the background whenever a ticket is cut.
- Each event is **signed with that device's own key**. Unsigned, forged or revoked-key events are rejected and never affect predictions.
- Duplicate deliveries of the same event count once.
- In a dead zone the device holds events and sends them on reconnect. They're placed by **when they happened**, so a network gap never looks like a delay, and a late batch never moves a bus backwards.
- [ ] A forged event (wrong key) is rejected, and rider predictions don't change.
- [ ] Sending the same event twice changes nothing the second time.
- [ ] Withholding events, then flushing them, produces the same predictions as if they had arrived on time.

### Demo Replay (script, not product)
Source: `scope.md > What "Working" Looks Like`.
- Seeded network: a few routes (each direction its own route) whose shared stops make a transfer possible, plus journeys with timetables **deliberately ~15 min wrong**.
- A background script plays the conductors: it sends signed events for two or three journeys back to back (about 20 events over about an hour), while the learner screen-records the phone and fast-forwards.
- [ ] The first journey opens at timetable time and its prediction drifts to reality as events arrive. A later journey **opens already corrected**.

## States and Boundaries
- **First use:** lands on Search. No onboarding or greeting.
- **From = To:** Search stays disabled.
- **No route, even with changes:** "No buses connect these stops," with a swap suggestion if the reverse is served.
- **No more journeys today:** the option shows "No more buses today", with tomorrow's first departure if known.
- **Journey not started:** "not started · expected [time]".
- **Stale bus** (no event for a long while): the row keeps the last-seen time ("last seen 25 min ago") so the rider can judge it (no automatic "lost" state).
- **Signed out:** full search and results. Only Notify me asks for sign-in.
- **Persistence:** alerts belong to the signed-in rider. Search is not remembered.

## Product Decisions
- **Defaults proposed by the agent and approved by the learner with the PRD:** saved commutes recur daily, Save sits next to Notify me, a minimal My commutes list, alerts already passed are skipped, "No more buses today" state, stale buses show last-seen time.
- **Riders see predictions, never the raw timetable.** "Our whole goal is to not rely on a static timetable."
- **Late = estimated − expected (learned)**, not versus the timetable.
- **Results are ranked by total travel time including the wait**, and changes are shown only when they exist. "The user usually cares about their travel time."
- **Arrival-at-Y clock time and "last seen" on rows** were agent recommendations the learner accepted.
- **Notifications: 45/30/15-min countdown plus delay alerts every 10 min of lateness**, with the new arrival time.
- **Sign-in is optional** and needed only for alerts: one-time (Notify me) and recurring (saved commutes, "same time tmr").
- **Timetables are mandatory per journey.** "They have a rough timetable in hand anyway." This removes the "no data at all" state.
- **No admin panel.** "It's just a UI wrapper over SQL statements." Data is seeded, and this is revisited only if the demo needs it. (Revises `scope.md`.)
- **No conductor or simulator UI.** Conductors see no change, and the demo uses a background script.
- **Look and feel are refined iteratively during build** (3–4 rounds), not specified up front.

## What We're Building
- The rider app: Search, Results (direct and transfer options), Journeys with live predictions, Notify me, optional sign-in.
- Push notifications (countdown and delay).
- Signed, deduplicated, dead-zone-safe ticket-event ingestion.
- Prediction that learns from history, with expected vs estimated lateness.
- Seed data and the demo replay script.

## Deferred From the POC
- **Saved commutes / recurring daily alerts (slice 7):** deferred by the learner during `5-build`. The story is "carry on with your day; the app tells you when to leave", so the one-journey reminder (slice 6) matters more; recurring commutes come after.
- **Admin panel** for routes, journeys, buses and emitter keys: seeded via SQL for now and built only if the demo needs it.

## Possible Later Enhancements
- Real UPSRTC ticket-machine integration (same signing contract, so a real device is a drop-in).
- Rider-configurable alert thresholds.
- **Localization:** Hindi stop names and UI (bilingual English/Hindi). Prototyped during `5-build` UI round 3 and deferred by the learner as future scope.
- Showing "Timetable · Usually · Now" side by side on a journey (suggested, not adopted for now).

## Non-Goals
- **Live GPS / maps / lat-long:** riders need a wait time, not a moving dot (`scope.md > Not in the Design`).
- **Student-reported locations:** bad actors could alter the timeline.
- **Conductor-facing UI:** the ticket workflow stays unchanged.
- **Simulator UI:** the demo is driven by a script.

## Open Questions
1. ~~Product name~~ → decided in `5-build`: **On the way** (tab title, header, PWA manifest and install name; domain stays `basics.smartabeshackathon.tech`).
