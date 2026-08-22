# The analysis: Gemini via Google AI Studio

The report is a real reading of the user's photo. `POST /api/analysis` sends the
selfie and their questionnaire answers to Gemini and gets back structured JSON:
five area readings, three ranked opportunities, three matched haircuts, and then
one branch depending on the profile — makeup guidance for anyone who isn't male,
a facial-hair reading for anyone who is. All in one call, so the recommendations
are justified by the same pass that found the problems.

The two branches are never both wanted, and the API rejects an over-complex
schema outright, so `buildAnalysisSchema` leaves out whichever one wasn't asked
for rather than shipping a shape with both.

## Setup

```
GEMINI_API_KEY=…                       # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-3.7-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

Server-only, no `NEXT_PUBLIC_` prefix. `lib/server/gemini.ts` imports
`server-only`, so the build fails if it's ever pulled into a client component.

**Check the model id before you trust it:**

```bash
node --env-file=.env.local scripts/check-gemini.mjs
```

It lists every model your key can actually call and tells you whether
`GEMINI_MODEL` is one of them. If it isn't, set `GEMINI_MODEL` to something from
that list — it's a one-line change, nothing else depends on the id.

## The guardrails

`lib/server/analysisPrompt.ts` carries a system instruction that matters more
than the schema does. A vision model handed a face and asked to assess it will
produce confident, cruel output unless told not to. It is instructed to:

- Never rate attractiveness. Impact describes the **change**, never the person.
- Never call a feature a flaw, and never mention weight, race, ethnicity,
  disability, or anything a person can't change.
- Never try to identify the person.
- Make no medical claims; skincare guidance stays general and says so.
- Set `usable: false` and say what to retake if the photo isn't a clear,
  front-facing shot of one face — rather than inventing a reading.
- Stay inside the change level the user chose. "Small improvements" doesn't get
  a proposal to grow their hair out for a year.

For makeup specifically:

- Read undertone from skin in shadow, not the lit side, and say neutral rather
  than guess when the lighting won't support a call.
- Recommend product **types and shade descriptors**, never brand names or
  product shade codes — those can't be verified and a wrong base wastes money.
- Include at least one look under six minutes. Most people won't do fifteen
  minutes on a Tuesday.
- Say what to avoid in terms of undertone, never in terms of their face.

For facial hair specifically:

- Read the growth **in this photo** — density, how far up the cheek it reaches,
  whether the moustache connects — and recommend only what this person can
  currently grow.
- A clean shave is a real verdict, not a consolation prize. When the face reads
  better without one, `verdict` comes back `clean-shaven` and there is exactly
  one look: the shave itself, still renderable on their own face, because "you'd
  look better without it" is far easier to believe when you can see it.
- When a beard does suit, `verdict` is `beard` and there are three shapes,
  strongest first, each naming where the cheek line and neckline sit.
- Never describe growth as patchy, sparse or weak back at the person. Talk about
  what a shape does, not what a face lacks.

The route then re-validates everything: numbers clamped to 0–100, arrays cut to
length, opportunities re-sorted by impact, incomplete responses rejected. For the
beard it also enforces that the verdict and the looks agree — a clean-shaven
reading is cut to exactly one look, so the model can't hedge by naming a beard
alongside the shave it just recommended against.

## What happens when it fails

| Situation | Behaviour |
|---|---|
| No `GEMINI_API_KEY` | 503 `not_configured`, surfaced as an error — there is no sample to fall back to |
| No photo in R2 | The analysis can't run; the screen asks for a photo |
| Photo unusable | The model's own reason is shown, with "Use a different photo" |
| Wrong model id | Error names `GEMINI_MODEL` directly, so it's obvious what to fix |
| Call failed | Error and a retry — **never** a silent sample |

That last row is deliberate. Showing a fabricated reading of a real person's
face as if it were theirs is the one failure mode worth being strict about, so a
There is no sample data left in the app: every screen either shows a reading of the user's own photo or an empty state inviting them to take one.

## Cost control

`POST /api/analysis` is capped at 8 calls per user per hour. The limiter is
in-memory (`lib/server/rateLimit.ts`), so it resets on deploy and doesn't span
instances — move it to a shared store before real traffic.

## Previews

Renders are a second, separate call — see `docs/previews.md`. Hair, facial hair
and makeup all go through the same route and the same cache.
