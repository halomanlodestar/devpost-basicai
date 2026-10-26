## Inspiration

Thousands of day scholars around Ghaziabad ride UPSRTC buses to college and back, some of them 80 km a day. None of those buses have public live tracking. All anyone has is a printed timetable, and the timetable is a guess.

So people do the only safe thing: they leave early and wait. They skip the last ten minutes with friends, run to the stop, and stand at the roadside for half an hour. Then they do the same again tomorrow. `[Add your own version here: your commute, a friend's, the day it got to you.]`

The question riders actually ask isn't "where is the bus?" It's **"when do I leave?"**

## What it does

**On the way** tells you when to leave for your bus.

- **Search two stops** and see the next buses over the coming 24 hours, with a live "be at your stop by" time for each.
- **No direct bus?** It plans up to two changes, with the wait at each change shown and kept live.
- **Tap Notify me, with no sign-up.** You get a push 45, 30 and 15 minutes before you need to be at the stop, plus another every time the bus slips another 10 minutes. The phone's push subscription is its identity, so there's no account or password, and no email.
- **A line view** shows every stop on a route, with live buses and the transfer points drawn as connected coloured lines.
- **It's a PWA,** so it installs on your phone like an app.

The trick behind it: **we don't use GPS.** Conductors already cut a ticket at every stop. Each ticket becomes a signed check-in, "this bus, this stop, this minute", and that's enough to know where every bus really is. Nothing changes for the conductor: same machine, same tickets.

## How we built it

**Stack:**
- **Repo:** a Bun workspace.
- **API:** `Bun.serve` with tRPC v11, using live updates streamed from the server (SSE) for anything that changes.
- **Web:** Next.js 16 with Tailwind v4 and shadcn/ui.
- **Database:** Prisma 7 on Postgres.
- **The core logic** lives in a pure TypeScript package (`packages/core`). It covers trip matching, prediction, learning, journey planning and alert decisions, and is tested without a database.

**Signed tickets.** Each conductor device signs its events with
$$\text{sig} = \text{HMAC-SHA256}\big(k_{\text{device}},\ t \,\|\, \texttt{"."} \,\|\, \text{body}\big)$$
The server rejects anything sent more than 5 minutes off its clock, ignores duplicates by idempotency key, and sorts offline batches by when they happened. A bus that loses signal in a dead zone catches up correctly once it reconnects.

**A timetable that learns.** Every observed trip between two stops updates that road segment's travel time:
$$\hat{t}_n = (1-\alpha)\,\hat{t}_{n-1} + \alpha\, t_n, \qquad \alpha = \max\!\left(\tfrac{1}{n},\ 0.2\right)$$
- **The first real trip replaces the timetable outright,** since we already know the timetable is wrong.
- **After that it's a running mean** that settles into a recency-weighted average.
- **Outliers are ignored:** a trip outside $[0.33\times,\ 3\times]$ the current estimate, such as a breakdown or a clock glitch, doesn't count.
- **Real changes are adopted:** three outliers in a row on the same side become the new normal, as with a road closure.
- **Separate estimates per time of day,** because 8 a.m. traffic isn't 3 p.m. traffic.
- **Roads are shared:** routes that share a road share what's been learned about it.

**Prediction and planning.**
- **Live times:** each bus gets an expected time at every stop, from what's been learned, and an estimated one, from its latest ticket.
- **The planner** searches in rounds (RAPTOR-style) with 0–2 changes, a 5-minute connection buffer and a 24-hour horizon that wraps into tomorrow. It returns the three fastest options.

**Alerts with no accounts.**
- **Sending:** Web Push with VAPID keys, scheduled with Postgres plus in-process timers.
- **Updating:** timers re-arm on every incoming ticket and every 60 seconds.
- **Restarts:** pending alerts reload from the database when the server starts.

**Shipping.**
- **API:** compiled to a single Linux binary with `bun build --compile`, copied to EC2 and run under pm2 behind a Cloudflare Tunnel.
- **Web:** on Vercel.
- **A replay script** plays the conductors: it signs real ticket events, so the whole system can be demoed live.

**The video** is code too. It's drawn in Remotion, as React components that render video frames, with doodle characters, watercolour SVG filters and a voiceover generated with ElevenLabs.

## Challenges we ran into

- **The encryption we had to remove.** Device keys were stored with AES-GCM encryption. On the production server, decrypting a stored key started returning garbage. The key and the stored data were byte-for-byte identical to what decrypted fine everywhere else, and every standalone test on the same machine passed. After more than an hour without finding the cause, we chose to ship: the keys are now stored as-is, and the signature checks are unchanged. Encryption at rest moves to future scope. Along the way we added a log line that records why each ticket is rejected, and a `db:rekey` tool that issues new device keys without wiping what the system has learned.
- **Too many words.** The first UI explained everything in sentences. "Be at your stop by 1:40" next to "arrives 2:35" read as a one-hour wait. It took several rounds to get to a few words, units and icons that read at a glance.
- **"No more buses today."** An evening search used to come up empty. The planner now looks 24 hours ahead and carries over into tomorrow's timetable.
- **Production surprises:**
  - **CORS:** the site and the API were on different subdomains, and the API didn't allow the site's.
  - **The push key:** a VAPID key that only gets baked into the site at build time.
  - **Migrations:** the API crashed on a missing table when production migrations ran behind the deploy.

## Accomplishments that we're proud of

- **Self-correction is tested, not claimed.** A test replays a timetable that's 15 minutes wrong. After one observed journey, the next journey's predicted arrival lands within 2 minutes of reality.
- **It knows a breakdown from a road closure.** Over 25 simulated days, normal congestion nudges the estimate, a breakdown doesn't move it, and a closure is adopted on the third trip.
- **It works on a real phone.** A ticket sent 27 minutes late produced the push "Bus 1 is late by 27 min, be at Kavi Nagar by 2:57 pm" on an Android phone within seconds.
- **The route lookup is fast:** about 2–31 µs on a made-up test network of 5,000 stops and 1,000 routes.
- **It needs no new hardware and no sign-up.**

## What we learned

`[Your own lessons go here. Some candidates from this build:]`
- **Shipping beats perfect.** Knowing when to cut a feature (encryption at rest) kept the project on track.
- **Keeping all the logic in plain code** meant every hard case could be tested in milliseconds, without a database or a phone.
- **Fewer words make a better UI.**
- `[What you learned about working with an AI pair.]`

## What's next for On the Way

- **Real ticket machines.** Connect to the ticket devices UPSRTC conductors already carry, so the check-ins come from the real system.
- **Hindi and other local languages.**
- **Saved commutes.** Keep "college → home" and get the same alerts every day.
- **How full is the bus?** Ticket counts already show roughly how many people are on board.
- **Scaling out.** Each part can run on its own servers without a rewrite: ticket intake, the live updates (spread across servers with Redis), and the alert sender.
- **Encryption at rest,** brought back properly.
