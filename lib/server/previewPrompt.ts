import "server-only";

/**
 * Prompts for the image model. The whole value of a preview is that the person
 * looking at it recognises themselves — a beautiful render of someone else is
 * worse than no render at all. Identity preservation is therefore the first
 * instruction in every prompt, not a footnote.
 */

export type PreviewKind = "hairstyle" | "makeup" | "beard";

/** What the person told us in the questionnaire, not a guess from the photo. */
export type PreviewGender = "male" | "female" | null;

const IDENTITY = `
This is a photo of a real person who asked to see one specific change to their
own appearance. Edit THIS photograph. Do not generate a new person.

KEEP EXACTLY AS THEY ARE — these are how they recognise themselves:
- Face shape, jaw, chin, cheekbones and the width of the face
- Eyes: shape, spacing, colour, eyelids, brow position
- Nose: bridge, width, tip
- Mouth and lip shape
- Skin tone and undertone
- Age, and apparent ethnicity
- Any moles, freckles, scars or birthmarks
- Body, shoulders and posture

DO NOT:
- Slim, reshape or "beautify" the face in any way
- Smooth skin beyond the specific change requested
- Change the person's age, weight, ethnicity or gender presentation
- Swap the background, clothing or lighting
- Add text, watermarks, borders or a second person

The result must read as the same individual photographed on a different day —
close enough that a friend would not notice anything except the one change.
`.trim();

const FRAMING = `
Keep the original framing, camera angle, distance and lighting direction.
Photographic realism: real skin texture with visible pores, natural specular
highlights, no plastic or airbrushed finish, no illustration or 3D-render look.
Match the grain and sharpness of the source photo.
`.trim();

/**
 * The same cut name is worn differently on a masculine and a feminine head of
 * hair, so the presentation the person chose goes in with it. Without it the
 * model picks one from the face, which is the guess we are trying to avoid.
 */
function presentationLine(gender: PreviewGender) {
  if (gender === "male") {
    return "Render it as this cut is worn on a masculine head of hair.";
  }
  if (gender === "female") {
    return "Render it as this cut is worn on a feminine head of hair.";
  }
  return "Keep the gender presentation exactly as it reads in the source photo.";
}

/** Builds the edit instruction for one preview. */
export function buildPreviewPrompt(
  kind: PreviewKind,
  detail: string,
  notes?: string,
  gender: PreviewGender = null,
) {
  const change =
    kind === "hairstyle"
      ? `
THE ONE CHANGE — HAIR ONLY:
Restyle the hair to: ${detail}
${notes ? `Cut detail: ${notes}` : ""}
${presentationLine(gender)}

Keep the person's natural hair colour and their real hair texture — a straight
head of hair does not become curly because the cut changed. Render the cut as it
would actually fall on this texture, with a realistic hairline that starts where
theirs does. Facial hair stays exactly as it is unless the change names it.
`.trim()
      : kind === "beard"
        ? `
THE ONE CHANGE — FACIAL HAIR ONLY:
Groom the facial hair to: ${detail}
${notes ? `Trim detail: ${notes}` : ""}

The hair on their head does not change. Not the cut, not the length, not how it
falls.

Match the beard to the growth this face already has — its colour, its coarseness
and where it actually grows. Do not give them denser or fuller growth than the
photo shows, do not fill in where growth is genuinely thin, and keep the beard
line where their own growth starts rather than drawing a new one higher up the
cheek. A believable beard on this person beats an impressive one on someone else.

If the change is a clean shave, remove the facial hair completely and show the
real skin underneath — including the tone difference, shadow and texture that
are actually there after shaving. Do not smooth or even out the jaw.
`.trim()
        : `
THE ONE CHANGE — MAKEUP ONLY:
Apply this makeup look: ${detail}
${notes ? `Application detail: ${notes}` : ""}

Wearable, everyday-realistic application — makeup sitting on real skin, not a
retouched beauty-campaign finish. Keep their natural brow shape and their hair
exactly as it is. Do not slim the nose, enlarge the eyes or reshape the lips;
colour and finish only.
`.trim();

  return `${IDENTITY}\n\n${change}\n\n${FRAMING}`;
}

/** Sanity bounds on what we'll accept back and store. */
export const PREVIEW_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
