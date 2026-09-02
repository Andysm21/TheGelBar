# Deploying The Gel Bar

This app currently runs on **mock in-memory data** (`lib/mock-data.ts`) so you
can see and click through everything without any account. To make it real —
real bookings saved, real logins, real calendar sync — follow the steps
below in order. None of this requires touching code beyond pasting keys into
`.env.local`.

## 0. Push to GitHub

The repo is already committed locally (`git init`, `git add -A`, initial
commit done) with the remote already pointed at
`https://github.com/Andysm21/TheGelBar.git`. From this folder, just:

```bash
git push -u origin main
```

That's the only step needed here — it'll prompt for your GitHub login
(browser or token) since it's your repo and I'm not authenticated as you.

## 1. Create the Supabase project (the database)

1. Go to [supabase.com](https://supabase.com) → sign up (free tier is enough
   to start) → **New project**. *(Already done.)*
2. Pick a name (e.g. `thegelbar`), a strong database password (save it
   somewhere), and the region closest to Egypt (usually an EU region).
3. Wait ~2 minutes for it to provision.
4. In the project, go to **SQL Editor** → **New query** → paste the entire
   contents of `supabase/schema.sql` from this repo → **Run**. This creates
   every table (bookings, profiles, services, etc.), the security rules, and
   seeds the real service catalog. **The booking model changed since the
   version you already ran** (one service + one optional design per
   booking, not the old multi-service list) — reset first, see the comment
   at the top of `supabase/schema.sql` for the exact `drop schema` command,
   then run the whole file fresh. Safe, no real data exists yet.
5. Create the storage bucket for inspo/gallery photos: the updated
   `schema.sql` creates it and its access policies for you (`inspo-images`,
   private). If your project rejects the direct `storage.buckets` insert,
   create it manually instead — **Storage → New bucket** → name it exactly
   `inspo-images`, leave it private — then just run the two `create policy
   "inspo-images: ..."` statements at the bottom of the file.
6. Go to **Project Settings → API**. Copy:
   - **Project URL** → becomes `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (keep secret, never share) → becomes
     `SUPABASE_SERVICE_ROLE_KEY`
7. Copy `.env.local.example` to `.env.local` and paste those three values in.

## 1b. Create your admin (owner) login

`/admin/login` (email + password, `app/[locale]/admin/login/page.tsx`) and
route protection (`middleware.ts`) are now both built — every `/admin/*`
URL checks for a real Supabase session **and** `profiles.role = 'owner'`
before rendering, redirecting to `/admin/login` otherwise. Until this
project is connected to Supabase (no env vars set), the middleware fails
open in dev only, so you can keep browsing the mock-data admin pages while
building — in production (`NODE_ENV=production`, i.e. once deployed to
Vercel) with no Supabase configured, it fails closed instead (503) rather
than leaving admin open. Once you complete the steps below, it's a real
gate — no code changes needed to activate it.

To actually create your login:

**Easiest — Supabase dashboard:**
1. **Authentication → Users → Add user** → enter an email + password for
   yourself (e.g. `mariam@thegelbar.eg` + a strong password you choose —
   pick it here, not asking me to invent one you'd have to trust me with).
2. Copy the new user's UUID from that row.
3. **SQL Editor** → run:
   ```sql
   update profiles set role = 'owner' where id = 'paste-the-uuid-here';
   ```
   (The `on_auth_user_created` trigger already created the `profiles` row
   automatically when you added the user — this just flips its role.)
4. Go to `/admin/login`, sign in with that email/password. You're in.

**Still needed in code** (not built yet): an actual `/admin/login` page
with an email/password form calling `supabase.auth.signInWithPassword`,
plus middleware that checks `profiles.role === 'owner'` before allowing
`/admin/*` — right now those pages are open to anyone who knows the URL.
Flag this if you want it prioritized before real launch.

## 2. Turn on Google sign-in (for clients logging in)

1. In Supabase: **Authentication → Providers → Google** → toggle it on.
2. You need a Google OAuth Client ID/Secret. Go to
   [Google Cloud Console](https://console.cloud.google.com) → create a
   project (or reuse one) → **APIs & Services → Credentials** → **Create
   Credentials → OAuth client ID** → type **Web application**.
3. Under **Authorized redirect URIs**, paste the callback URL Supabase shows
   you on that same Google provider settings page (looks like
   `https://<your-project>.supabase.co/auth/v1/callback`).
4. Copy the generated **Client ID** and **Client Secret** back into the
   Supabase Google provider fields → **Save**.

## 3. Google Calendar sync (owner's calendar)

Her calendar is Apple Calendar, but Apple has no simple public API for this,
so the real sync target is a **Google Calendar**, and she views it inside
Apple Calendar by adding that Google account on her iPhone
(Settings → Calendar → Accounts → Add Account → Google). Steps:

1. Same Google Cloud project as above → **APIs & Services → Library** →
   enable **Google Calendar API**.
2. Under the same OAuth client (or a new one scoped to `calendar.events`),
   generate credentials → put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in
   `.env.local`.
3. She signs in once (as the owner) through an admin "Connect Google
   Calendar" flow (not yet built — see "What's left" below) to grant this
   app access to her calendar; the resulting refresh token gets stored so
   the app can create/update/delete events without her re-approving each
   time.
4. On her iPhone: **Settings → Calendar → Accounts → Add Account → Google**
   → sign in with the same Google account → toggle Calendar on. Now every
   event this app creates shows up natively in her Apple Calendar app.

## 4. Email sending (booking confirmations, reminders)

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/mo,
   plenty for a solo salon).
2. Verify a sending domain (or use their shared test domain to start).
3. Create an API key → put it in `.env.local` as `RESEND_API_KEY`.

## 5. Deploy to Vercel

1. Push this repo to GitHub (if it isn't already): create a new repo on
   GitHub, then from this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → sign up with GitHub → **Add New
   Project** → import this repo.
3. Vercel auto-detects Next.js — no build settings to change.
4. Before clicking Deploy, open **Environment Variables** and paste in every
   value from your `.env.local` (same names, same values).
5. Click **Deploy**. In ~1 minute you get a live URL like
   `thegelbar.vercel.app` — that's the free domain mentioned in the plan;
   a custom domain (thegelbar.eg or similar) can be added later under
   **Project Settings → Domains** for ~$10-15/yr through any registrar.
6. Every future `git push` to `main` auto-deploys — no manual redeploy step.

## Security — what "secure" actually means here

No website is "100% secure" — that's not a real state any site reaches,
including banks'. What's achievable, and what this project does:

**Done:**
- `/admin/*` routes require a real session + `role = 'owner'` (middleware,
  above) — the biggest gap from before, now closed.
- Row Level Security on every table (`supabase/schema.sql`) — even if
  someone got a valid client session, Postgres itself blocks them from
  reading/writing another client's bookings or profile; this holds even
  if a future bug in application code forgot a check.
- Passwords never touch this codebase — Supabase Auth owns them
  (industry-standard hashing, not something rolled here).
- `.env.local` (real keys) is gitignored — never committed, never pushed.
- Storage bucket policies scope inspo photo access to their owner + the
  admin only (`schema.sql`).

**Still worth doing before real launch (flag if you want these next):**
- Rate limiting on `/admin/login` and the booking-creation endpoint (stops
  password brute-forcing and booking-spam) — not yet added, needs either
  Vercel's built-in protection tier or a small middleware counter.
- Security headers (`Content-Security-Policy`, `X-Frame-Options`, etc.) —
  not yet set in `next.config.mjs`.
- The `npm audit` items already flagged below — real vulnerabilities in
  dependencies, fixed by version bumps, deferred so the build stayed
  simple while everything was mock data.
- 2FA on your own Supabase and Vercel accounts (not app code, but the
  actual keys to everything — worth turning on regardless).

## Egress & caching strategy (keeping DB calls to a minimum)

This was a specific requirement, so it's worth stating plainly what the
codebase does about it:

- **`lib/supabase/cached-queries.ts`** is where every real Supabase read
  will live. Every function is wrapped in React's `cache()`, which
  de-dupes identical calls within one request — if the landing page,
  the nav, and a widget all ask for the service catalog, that's one
  network call, not three.
- **No N+1, anywhere.** The bookings list query joins `services` and
  `design_options` in the same round trip
  (`.select('..., services(name_en), design_options(name_en)')`) instead
  of fetching a booking then separately fetching its service — that
  pattern is what an N+1 looks like and it's deliberately avoided.
- **Calendar/availability is fetched by month, not by day.** One query
  per visible month grid (`getMonthAvailability`), never 30 queries for
  30 day cells. The `Calendar` component already expects data in that
  shape.
- **Only the columns actually rendered are selected** — no
  `select('*')` on wide tables.
- **Static catalog data (services, design options) is the best egress
  win available**: wrap `getServiceCatalog`/`getDesignOptions` in
  Next.js's `unstable_cache` with a long `revalidate` (say, 1 hour) and
  call `revalidateTag` from the admin "save service" action — after
  that, almost no request touches Supabase for this data at all, it
  serves from Next's cache. Not yet added (needs a live project to test
  against) but the seam is exactly `cached-queries.ts`.
- When you actually wire a mock function to Supabase, replace its body
  with the matching function from `cached-queries.ts` — don't write a
  fresh query inline in a page component, so this pattern doesn't erode
  over time.

## What's already wired vs. still mock

**Working now, no setup needed:** every page and click-through flow, the
single-service + design-tier duration/price calculator, the loyalty
free-session math (11th session free, no point, resets to 1 next), the
calendar-format date/time pickers (client booking + owner slot
management), the scroll-driven manicure animation, English UI (Arabic
translations exist and render RTL correctly, admin stays English-only per
your call).

**Needs the steps above, then a small follow-up code pass:**
- Swapping `lib/mock-data.ts` calls for the real ones already written in
  `lib/supabase/cached-queries.ts` (shapes match `supabase/schema.sql`
  exactly, so this is a drop-in swap, not new logic)
- Real Google OAuth login button action (`lib/supabase/client.ts` already
  has the call; the `on_auth_user_created` trigger in `schema.sql` means
  the moment someone signs in with Google, a row appears in `profiles`
  automatically — no extra signup API call needed)
- Owner's "Connect Google Calendar" admin flow + the actual event
  create/update/delete calls on approve/reschedule/cancel
- `.ics` file generation + attaching it to the Resend emails
- Wiring the "Mark as Paid" button to actually persist
  `loyalty_points = nextLoyaltyPoints(...)` in Supabase (the function
  itself, in `lib/services-catalog.ts`, already implements your exact
  rule and is unit-testable as-is)
- Inspo photo upload → the `inspo-images` storage bucket (policies already
  in `schema.sql`, just needs the client-side upload call)

None of this is a rebuild — it's replacing mock function bodies with real
Supabase calls using the exact same data shapes already in place.

## Known security follow-up

`npm audit` currently flags several advisories in `next` (14.2.x line) and
`next-intl` (3.x line) that are only fixed by major-version upgrades (Next
16, next-intl 4). This project intentionally stayed on the more stable
14/3.x lines to keep the build simple while everything is still mock data.
**Before this goes live with real user data, run `npm audit fix --force`
and re-test the booking flow** — budget an hour or two for the migration
since both are breaking version bumps.
