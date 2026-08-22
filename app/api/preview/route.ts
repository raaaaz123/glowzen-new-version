import { AuthError, requireUser } from "@/lib/server/auth";
import {
  getObjectBytes,
  isR2Configured,
  ownsKey,
  previewKey,
  putObjectBytes,
} from "@/lib/server/r2";
import { rateLimit } from "@/lib/server/rateLimit";
import { GEMINI_IMAGE_MODEL, gemini, isGeminiConfigured } from "@/lib/server/gemini";
import {
  MAX_PREVIEW_BYTES,
  PREVIEW_MIME,
  buildPreviewPrompt,
  type PreviewGender,
  type PreviewKind,
} from "@/lib/server/previewPrompt";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(message: string, status: number, code?: string) {
  return Response.json({ error: message, code }, { status });
}

const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/**
 * Renders one change onto the user's own photo.
 *
 * The uploaded selfie is the reference: it goes to the model as image input and
 * the prompt forbids altering anything but the requested change, so the face
 * coming back is the same face. The result is stored under the user's own R2
 * prefix and served through the existing signed-URL route.
 */
export async function POST(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUser(request));
  } catch (error) {
    return fail(error instanceof AuthError ? error.message : "Unauthorized.", 401);
  }

  // Image generation is the most expensive call in the app by a wide margin.
  if (!rateLimit(`preview:${uid}`, 20, 60 * 60_000)) {
    return fail("You've generated a lot of previews this hour. Try again later.", 429);
  }

  if (!isGeminiConfigured || !isR2Configured) {
    return fail("Previews aren't configured on this server.", 503, "not_configured");
  }

  const body = (await request.json().catch(() => null)) as {
    photoKey?: unknown;
    kind?: unknown;
    detail?: unknown;
    notes?: unknown;
    gender?: unknown;
  } | null;

  const kind: PreviewKind =
    body?.kind === "makeup" ? "makeup" : body?.kind === "beard" ? "beard" : "hairstyle";
  // "neutral" and a missing answer both mean the same thing to the renderer:
  // read the presentation off the photo rather than being told one.
  const gender: PreviewGender =
    body?.gender === "male" || body?.gender === "female" ? body.gender : null;
  const detail = text(body?.detail, 300);
  const notes = text(body?.notes, 300);
  if (!detail) return fail("Nothing to render.", 400);

  const photoKey = text(body?.photoKey, 200);
  if (!ownsKey(uid, photoKey)) return fail("We couldn't find that photo.", 404);

  let photo: { bytes: Uint8Array; contentType: string };
  try {
    photo = await getObjectBytes(photoKey);
  } catch {
    return fail("We couldn't read your photo. Try uploading it again.", 404);
  }

  let image: { bytes: Uint8Array; mimeType: string } | null = null;
  try {
    const response = await gemini().models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: photo.contentType,
                data: Buffer.from(photo.bytes).toString("base64"),
              },
            },
            { text: buildPreviewPrompt(kind, detail, notes, gender) },
          ],
        },
      ],
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      const inline = part.inlineData;
      if (!inline?.data) continue;
      const mimeType = inline.mimeType ?? "image/png";
      if (!PREVIEW_MIME.has(mimeType)) continue;
      const bytes = Buffer.from(inline.data, "base64");
      if (bytes.byteLength > MAX_PREVIEW_BYTES) break;
      image = { bytes, mimeType };
      break;
    }
  } catch (error) {
    const detailMsg = error instanceof Error ? error.message : String(error);
    console.error("[glowzen] Preview generation failed:", detailMsg);
    const isModel = /not found|not supported|404|model/i.test(detailMsg);
    return fail(
      isModel
        ? `The model "${GEMINI_IMAGE_MODEL}" didn't accept that request. Check GEMINI_IMAGE_MODEL in .env.local.`
        : "That preview didn't render. Try again in a moment.",
      502,
      isModel ? "bad_model" : "upstream",
    );
  }

  // The model can decline to return an image — usually a safety refusal. Say so
  // rather than showing the user a broken frame or someone else's face.
  if (!image) {
    return fail("That preview didn't render. Try a different photo or style.", 422, "no_image");
  }

  const ext = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/webp" ? "webp" : "png";
  const key = previewKey(uid, crypto.randomUUID(), ext);
  try {
    await putObjectBytes(key, image.bytes, image.mimeType);
  } catch (error) {
    console.error("[glowzen] Preview upload failed:", error);
    return fail("We rendered it but couldn't save it. Try again.", 502, "storage");
  }

  return Response.json({ key });
}
