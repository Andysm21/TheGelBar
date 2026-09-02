# The Gel Bar

Next.js app for Mariam's solo nail salon — bilingual (EN/AR) booking site
with multi-service selection, loyalty points, and an animated scroll-driven
manicure process on the landing page.

- Full architecture + decisions log: `/Users/andrew/.claude/plans/i-have-a-friend-sequential-scone.md`
- Getting a real database/login/calendar/email working: see `DEPLOY.md`
- Static HTML click-through mockups (all 14 screens, no build step): `mockups/`

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` (redirects to `/en`). Try `/ar` for the
Arabic/RTL version.

Runs entirely on mock data (`lib/mock-data.ts`) until Supabase is connected
— see `DEPLOY.md` for that.
