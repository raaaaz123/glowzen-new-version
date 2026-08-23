import { AuthError, requireUser } from "@/lib/server/auth";
import { getObjectBytes, isR2Configured, ownsKey } from "@/lib/server/r2";
import { rateLimit } from "@/lib/server/rateLimit";
import { GEMINI_MODEL, gemini, isGeminiConfigured } from "@/lib/server/gemini";
import {
  SYSTEM_INSTRUCTION,
  buildAnalysisSchema,
  buildPrompt,
} from "@/lib/server/analysisPrompt";
import { requestLocale, serverT } from "@/lib/server/i18n";
import type { QuestionnaireAnswers } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(message: string, status: number, code?: string) {
  return Response.json({ error: message, code }, { status });
}

const clamp = (n: unknown, lo = 0, hi = 100) =>
  Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)));

export async function POST(request: Request) {
  // The body is read first so its `locale` can carry every message below —
  // including the ones that fire before we have looked at anything else.
  const body = (await request.json().catch(() => null)) as {
    photoKey?: unknown;
    answers?: Partial<QuestionnaireAnswers>;
    wantsMakeup?: boolean;
    wantsBeard?: boolean;
    locale?: unknown;
  } | null;

  const locale = requestLocale(request, body ?? undefined);
  const t = serverT(locale);

  let uid: string;
  try {
    ({ uid } = await requireUser(request));
  } catch (error) {
    // The specific reason — no token, expired token, unconfigured project — is
    // a server detail. The caller gets one translated line either way.
    if (!(error instanceof AuthError)) console.error("[glowzen] Auth failed:", error);
    return fail(t("server.unauthorized"), 401);
  }

  // Each analysis is a paid vision call, so the ceiling is deliberately low.
  if (!rateLimit(`analysis:${uid}`, 8, 60 * 60_000)) {
    return fail(t("server.rateAnalysis"), 429);
  }

  if (!isGeminiConfigured || !isR2Configured) {
    return fail(t("server.notConfiguredAnalysis"), 503, "not_configured");
  }

  const wantsMakeup = body?.wantsMakeup === true;
  const wantsBeard = body?.wantsBeard === true;

  const photoKey = typeof body?.photoKey === "string" ? body.photoKey : "";
  if (!ownsKey(uid, photoKey)) return fail(t("server.photoNotFound"), 404);

  let photo: { bytes: Uint8Array; contentType: string };
  try {
    photo = await getObjectBytes(photoKey);
  } catch {
    return fail(t("server.photoUnreadable"), 404);
  }

  let parsed: Record<string, unknown>;
  try {
    const response = await gemini().models.generateContent({
      model: GEMINI_MODEL,
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
            { text: buildPrompt(body?.answers ?? {}, wantsMakeup, wantsBeard, locale) },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: buildAnalysisSchema({ wantsMakeup, wantsBeard }),
        temperature: 0.6,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response.");
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[glowzen] Gemini analysis failed:", detail);
    // A wrong model id is the likeliest cause, so name it rather than "unknown error".
    const isModel = /not found|not supported|404|model/i.test(detail);
    return fail(
      isModel
        ? t("server.badModel", { model: GEMINI_MODEL })
        : t("server.analysisUpstream"),
      502,
      isModel ? "bad_model" : "upstream",
    );
  }

  if (parsed.usable === false) {
    // The model was told to write in the user's language, so its own
    // explanation of what to retake already is — prefer it over ours.
    return fail(
      typeof parsed.issue === "string" && parsed.issue
        ? parsed.issue
        : t("server.unusablePhoto"),
      422,
      "unusable_photo",
    );
  }

  // Never trust the model's numbers or array lengths verbatim.
  const scores = Array.isArray(parsed.scores) ? parsed.scores.slice(0, 5) : [];
  const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 3) : [];
  const hairstyles = Array.isArray(parsed.hairstyles) ? parsed.hairstyles.slice(0, 3) : [];

  if (opportunities.length < 3 || hairstyles.length < 3) {
    return fail(t("server.analysisIncomplete"), 502, "incomplete");
  }

  const makeup = wantsMakeup && parsed.makeup ? normaliseMakeup(parsed.makeup) : undefined;
  const beard = wantsBeard && parsed.beard ? normaliseBeard(parsed.beard) : undefined;

  return Response.json({
    overall: clamp(parsed.overall),
    summary: String(parsed.summary ?? ""),
    scores: scores.map((s) => {
      const row = s as Record<string, unknown>;
      return {
        key: String(row.key ?? ""),
        label: String(row.label ?? ""),
        value: clamp(row.value),
        note: String(row.note ?? ""),
      };
    }),
    opportunities: opportunities
      .map((o) => {
        const row = o as Record<string, unknown>;
        return {
          area: String(row.area ?? "face"),
          title: String(row.title ?? ""),
          impact: clamp(row.impact),
          headline: String(row.headline ?? ""),
          description: String(row.description ?? ""),
          recommendation: String(row.recommendation ?? ""),
          why: String(row.why ?? ""),
          steps: (Array.isArray(row.steps) ? row.steps : []).slice(0, 3).map(String),
        };
      })
      .sort((a, b) => b.impact - a.impact),
    hairstyles: hairstyles
      .map((h) => {
        const row = h as Record<string, unknown>;
        return {
          name: String(row.name ?? ""),
          match: clamp(row.match),
          blurb: String(row.blurb ?? ""),
          why: String(row.why ?? ""),
          barberNotes: String(row.barberNotes ?? ""),
          maintenance: String(row.maintenance ?? ""),
          tags: (Array.isArray(row.tags) ? row.tags : []).slice(0, 2).map(String),
        };
      })
      .sort((a, b) => b.match - a.match),
    makeup,
    beard,
  });
}

/**
 * A clean shave is a legitimate verdict, so the one thing that must hold is
 * that the styles and the verdict agree: a clean-shaven reading gets exactly
 * one look — the shave — and never a beard the model also felt like naming.
 */
function normaliseBeard(input: unknown) {
  const b = input as Record<string, unknown>;
  const cleanShaven = String(b.verdict) === "clean-shaven";

  const styles = (Array.isArray(b.styles) ? b.styles : [])
    .slice(0, cleanShaven ? 1 : 3)
    .map((row) => {
      const s = row as Record<string, unknown>;
      return {
        name: String(s.name ?? ""),
        match: clamp(s.match),
        blurb: String(s.blurb ?? ""),
        why: String(s.why ?? ""),
        barberNotes: String(s.barberNotes ?? ""),
        maintenance: String(s.maintenance ?? ""),
        tags: (Array.isArray(s.tags) ? s.tags : []).slice(0, 2).map(String),
      };
    })
    .filter((s) => s.name)
    .sort((a, b2) => b2.match - a.match);

  // Nothing to show and nothing to render — better absent than half-formed.
  if (!styles.length) return undefined;

  return {
    verdict: cleanShaven ? "clean-shaven" : "beard",
    growth: String(b.growth ?? ""),
    summary: String(b.summary ?? ""),
    recommendation: String(b.recommendation ?? ""),
    styles,
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

function shades(input: unknown) {
  return (Array.isArray(input) ? input : []).slice(0, 3).map((row) => {
    const s = row as Record<string, unknown>;
    const hex = String(s.hex ?? "");
    return {
      name: String(s.name ?? ""),
      // A bad hex would render as a transparent swatch, so fall back to a grey.
      hex: HEX.test(hex) ? hex : "#8B7361",
      note: String(s.note ?? ""),
    };
  });
}

function normaliseMakeup(input: unknown) {
  const m = input as Record<string, unknown>;
  const looks = (Array.isArray(m.looks) ? m.looks : []).slice(0, 3);
  if (!looks.length) return undefined;

  return {
    undertone: ["warm", "cool", "neutral", "olive"].includes(String(m.undertone))
      ? String(m.undertone)
      : "neutral",
    depth: String(m.depth ?? ""),
    season: m.season ? String(m.season) : undefined,
    summary: String(m.summary ?? ""),
    base: shades(m.base),
    cheek: shades(m.cheek),
    lip: shades(m.lip),
    eye: shades(m.eye),
    avoid: (Array.isArray(m.avoid) ? m.avoid : []).slice(0, 3).map((row) => {
      const a = row as Record<string, unknown>;
      return { label: String(a.label ?? ""), reason: String(a.reason ?? "") };
    }),
    looks: looks
      .map((row) => {
        const l = row as Record<string, unknown>;
        return {
          name: String(l.name ?? ""),
          match: clamp(l.match),
          minutes: Math.max(1, Math.min(60, Math.round(Number(l.minutes) || 5))),
          blurb: String(l.blurb ?? ""),
          why: String(l.why ?? ""),
          steps: (Array.isArray(l.steps) ? l.steps : []).slice(0, 5).map(String),
          shades: shades(l.shades),
          products: (Array.isArray(l.products) ? l.products : []).slice(0, 4).map((row2) => {
            const p = row2 as Record<string, unknown>;
            return { type: String(p.type ?? ""), lookFor: String(p.lookFor ?? "") };
          }),
        };
      })
      .sort((a, b) => b.match - a.match),
  };
}
