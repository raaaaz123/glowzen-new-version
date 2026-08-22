# Glowzen — web

Mobile-first web app for AI appearance improvement. Selfie → analysis → top
improvements → visualise the change → 30-day plan → track progress.

The value proposition is **"find the changes that will make the biggest
difference — and see them before you make them"**, not attractiveness scoring.
Copy and UI throughout follow that: figures are framed as *impact* and
*opportunity*, never as a rating of the person.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Config lives in `.env.local` — Firebase is filled in for `glowzen-ee2d3`; the
`R2_*` values are yours to add. Copy `.env.example` for a fresh one.

- **[firebase/README.md](firebase/README.md)** — the two console steps that turn
  persistence on (anonymous sign-in, Firestore rules).
- **[docs/photo-storage.md](docs/photo-storage.md)** — the private R2 bucket that
  holds user photos, and why uploads proxy through the server.
- **[docs/ai-analysis.md](docs/ai-analysis.md)** — Gemini reads the photo and
  produces the report, plus the guardrails on what it's allowed to say.
- **[docs/retention.md](docs/retention.md)** — the daily, weekly and monthly
  loops that carry a user to day 60.

Until those are set up the app shows empty states inviting a first scan, and every
screen still works.

## Screens

| Route            | Screen                                             |
| ---------------- | -------------------------------------------------- |
| `/`              | Welcome                                            |
| `/questionnaire` | Six-step questionnaire (gender + age, then 5 questions) |
| `/upload`        | Selfie upload with photo guidance                   |
| `/analyzing`     | Analysis animation                                  |
| `/home`          | Dashboard                                           |
| `/results`       | Glow-Up Report                                      |
| `/improvements`  | Top 3 improvements                                  |
| `/styles`        | Hairstyle previews with before/after comparison     |
| `/styles/[id]`   | Style detail — why it works, what to tell your barber |
| `/makeup`        | Undertone, matched shades and looks                 |
| `/plan`          | 60-day plan, daily routine and milestones           |
| `/progress`      | Before/after and movement                           |
| `/analyze`       | New analysis + history                              |
| `/profile`       | Preferences, privacy, data controls                 |

`/` through `/analyzing` are full-bleed onboarding. Everything else sits inside
the app shell — tab bar on phones, sidebar from `lg` up.

## Gender

The first questionnaire step sets `male`, `female` or `neutral`, and that choice
drives the rest of the app: which options appear (facial hair vs brows and
lashes), which portraits and hairstyles are shown, the wording of grooming
advice, and whether the style detail says "barber" or "stylist". Content packs
live in `lib/data/showcase.ts`; question sets live in
`lib/data/questions.ts`.

Makeup guidance is offered to female and non-binary profiles and hidden on male
ones — a default in `wantsMakeup()`, not a rule, and a one-line change if you'd
rather offer it to everyone.

## Structure

```
app/
  page.tsx                welcome
  questionnaire|upload|analyzing/
  (app)/                  app shell — tab bar / sidebar
components/
  ui/                     Button, Card, Sheet, Toast, ProgressRing, ImageFrame, …
  app/                    BottomNav, SideRail, TopBar, StickyCta
  glow/CompareSlider      the before/after wipe
app/api/analysis/         Gemini reads the photo, returns the report
app/api/photos/           upload + delete, and signed read URLs
lib/
  firebase/               config, auth, firestore
  server/                 server-only: token verification, R2, Gemini, prompts
  storage/photos          client side of the photo API
  data/                   question sets + landing-page assets
  state/GlowContext       session state, localStorage + Firestore
services/                 userService, analysisService, transformationService, progressService
scripts/gen-portraits.mjs generates the portrait illustrations in public/img
```

The UI never imports `firebase/*`, the storage SDK or the Gemini SDK directly —
it only calls `services/*`. Those surface an empty state when a
dependency isn't configured, so a locked ruleset or a missing key never breaks a
screen. A genuine failure surfaces as an error and a retry, never as a silent
first scan hasn't happened yet.

User photos go to a private Cloudflare R2 bucket through our own API routes, so
the browser never holds a storage credential and every upload is size-, type-
and owner-checked server-side. Details in
[docs/photo-storage.md](docs/photo-storage.md).

## Imagery

The landing page and photo guide use four AI-generated photos in `public/img` — one
before and one after per person, same face, same room, different grooming and
outfit:

```
photo-male-before.jpg    photo-male-after.jpg
photo-female-before.jpg  photo-female-after.jpg
```

Each has a `-sm` variant for avatars and list rows. They are labelled as
illustrative examples on the welcome screen — they are not real customers, and
the page says so.

Only the best-matched hairstyle has a rendered preview. The other two per gender
show an honest "no preview rendered yet" panel with the barber notes rather than
a picture of someone else's haircut. To make all three previewable, generate two
more after-photos per person from the same face reference and set `image` on
those entries in `lib/data/showcase.ts`.

The neutral photo guide still uses generated SVG illustrations, so a non-binary user
sees a consistent set rather than a mix. Regenerate them with:

```bash
node scripts/gen-portraits.mjs
```

## Design

Near-black violet-cast surfaces, warm off-white cards for the moments that
matter (the report hero, today's focus), one champagne accent used as light on
skin. Inter throughout, set heavy and tight for headlines; a system mono carries
the small data labels. Phone-width column centred on desktop with two-column
layouts where they earn it — never a full-width dashboard.
