# On-face previews

Every preview image is generated from the user's own uploaded selfie. There are
no stock "after" photos anywhere in the app.

## Pipeline

```
selfie in R2  ──▶  /api/preview  ──▶  gemini-3.1-flash-image  ──▶  R2  ──▶  signed URL
                   (auth, rate limit,      (photo as reference,      (same uid prefix)
                    ownership check)        one change only)
```

`app/api/preview/route.ts` reads the stored photo, sends it to the image model
as `inlineData` alongside the edit instruction, validates what comes back, and
writes it to `photos/{uid}/previews/{uuid}.{ext}` — under the same prefix
`ownsKey` already guards, so a preview is exactly as private as the selfie.

## Keeping the same face

`lib/server/previewPrompt.ts` holds the prompt. Identity preservation is the
first instruction, not a footnote — a flattering render of someone else is worse
than no render at all. It pins face shape, eyes, nose, mouth, skin tone, age,
apparent ethnicity, moles and freckles, plus background, clothing and lighting,
and explicitly forbids slimming or "beautifying".

Verified against both sample selfies: the same person, room, clothing and
distinguishing marks come back with only the hair (or only the makeup) changed.

**Known drift:** the model still lightens blemishes and redness slightly, even
though the prompt forbids it. It's mild, but it means a skin preview would
overstate results — which is why only hair, facial hair and makeup are rendered.

## Facial hair

The beard prompt pins two things the model otherwise gets wrong. First, the hair
on their head does not change — it is a separate recommendation on a separate
screen, and a render that quietly restyles both is useless for judging either.
Second, the beard has to match the growth this face already has: no denser than
the photo shows, nothing filled in where growth is genuinely thin, and the beard
line left where their own starts. A believable beard on this person beats an
impressive one on someone else.

A clean shave goes through the same path — it is a change like any other, and it
is the one people most want to see before committing, since growing it back
costs weeks. The prompt asks for the real skin underneath, shadow and tone
difference included, rather than a smoothed jaw.

## Matching the presentation

The same cut name hangs differently on a masculine and a feminine head of hair,
so the presentation the person chose in the questionnaire travels with the
request and lands in the prompt (`presentationLine`). Male and female each pin
the render; non-binary and "prefer not to say" tell the model to keep the
presentation exactly as the source photo reads it, rather than picking one off
the face.

The cuts themselves are matched the same way — `analysisPrompt.ts` states the
constraint as an instruction ("all three cuts must be masculine ones"), because
a bare `Presents as: female` line reads as background and the model will happily
follow it with a barber taper. `generatePreview` renders against the gender
stored on the *analysis*, not the current selection, so the render can never
contradict the cut it is rendering.

## Cost control

Renders are the most expensive call in the app, so:

- 20 per user per hour (`rateLimit`)
- every result is kept in `glowzen_web_users/{uid}/state/previews` as
  `{ key, photoKey }` under the style or look id, and reused rather than
  regenerated
- `photoKey` is what makes reuse safe. Style ids come from the cut's name and
  rank, so a second analysis can reissue an id an earlier render already used —
  without the photo recorded alongside, someone who re-uploads gets yesterday's
  face back under today's id. Entries written before this carry no photo and are
  still reused; they were rendered from whatever selfie was current then.
- signed read URLs are held for eight of their ten minutes
  (`lib/storage/photos.ts`), so walking back onto a screen doesn't re-sign every
  render it shows
- `/styles` and `/beard` each generate their top match on open; every other
  render is an explicit tap. Looks that already have a stored render say "View
  saved" instead of "Preview", so nobody spends a render finding out it was free
- the style detail page only ever shows a render that already exists

## When there's no photo

`components/glow/PreviewPending.tsx` says so plainly and links to `/analyze`.
It never substitutes a stock image.
