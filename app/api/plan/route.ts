import { AuthError, requireUser } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rateLimit";
import { GEMINI_MODEL, gemini, isGeminiConfigured } from "@/lib/server/gemini";
import { PLAN_SCHEMA, PLAN_SYSTEM_INSTRUCTION, buildPlanPrompt } from "@/lib/server/analysisPrompt";
import { requestLocale, serverT } from "@/lib/server/i18n";
import type { QuestionnaireAnswers } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(message: string, status: number, code?: string) {
  return Response.json({ error: message, code }, { status });
}

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Builds the eight-week plan from an analysis the user already has.
 *
 * This is a second Gemini call rather than part of the analysis: the combined
 * analysis + plan + makeup schema is rejected as too complex, and splitting it
 * lets the report land while the plan is still being written.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    answers?: Partial<QuestionnaireAnswers>;
    summary?: unknown;
    opportunities?: unknown;
    topHairstyle?: { name?: unknown; maintenance?: unknown };
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

  if (!rateLimit(`plan:${uid}`, 12, 60 * 60_000)) {
    return fail(t("server.ratePlan"), 429);
  }

  if (!isGeminiConfigured) {
    return fail(t("server.notConfiguredPlan"), 503, "not_configured");
  }

  const opportunities = (Array.isArray(body?.opportunities) ? body.opportunities : [])
    .slice(0, 3)
    .map((row) => {
      const o = row as Record<string, unknown>;
      return {
        title: str(o.title, 80),
        recommendation: str(o.recommendation, 300),
        steps: (Array.isArray(o.steps) ? o.steps : []).slice(0, 3).map((s) => str(s, 120)),
      };
    })
    .filter((o) => o.title);

  if (!opportunities.length) return fail(t("server.noAnalysisForPlan"), 400);

  let parsed: Record<string, unknown>;
  try {
    const response = await gemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPlanPrompt({
                answers: body?.answers ?? {},
                summary: str(body?.summary, 600),
                opportunities,
                topHairstyle: body?.topHairstyle?.name
                  ? {
                      name: str(body.topHairstyle.name, 80),
                      maintenance: str(body.topHairstyle.maintenance, 120),
                    }
                  : undefined,
                locale,
              }),
            },
          ],
        },
      ],
      config: {
        systemInstruction: PLAN_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: PLAN_SCHEMA,
        temperature: 0.6,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response.");
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[glowzen] Gemini plan failed:", detail);
    const isModel = /not found|not supported|404|model/i.test(detail);
    return fail(
      isModel ? t("server.badModel", { model: GEMINI_MODEL }) : t("server.planUpstream"),
      502,
      isModel ? "bad_model" : "upstream",
    );
  }

  const plan = normalisePlan(parsed, t("server.planFallbackTitle"));
  if (!plan) return fail(t("server.planIncomplete"), 502, "incomplete");

  return Response.json({ plan });
}

const WHEN = new Set(["am", "pm", "weekly"]);

/** The plan drives eight weeks of UI, so shape it strictly before trusting it. */
function normalisePlan(input: unknown, fallbackTitle: string) {
  const p = input as Record<string, unknown> | undefined;
  if (!p) return undefined;

  const weeks = (Array.isArray(p.weeks) ? p.weeks : [])
    .slice(0, 8)
    .map((row, i) => {
      const w = row as Record<string, unknown>;
      const week = Math.min(8, Math.max(1, Math.round(Number(w.week) || i + 1)));
      return {
        week,
        phase: (week <= 4 ? 1 : 2) as 1 | 2,
        title: String(w.title ?? ""),
        focus: String(w.focus ?? ""),
        tasks: (Array.isArray(w.tasks) ? w.tasks : []).slice(0, 4).map(String).filter(Boolean),
      };
    })
    .filter((w) => w.title && w.tasks.length)
    .sort((a, b) => a.week - b.week);

  if (weeks.length < 8) return undefined;

  const habits = (Array.isArray(p.habits) ? p.habits : [])
    .slice(0, 6)
    .map((row) => {
      const h = row as Record<string, unknown>;
      const when = String(h.when ?? "am");
      return {
        label: String(h.label ?? ""),
        when: WHEN.has(when) ? when : "am",
        detail: String(h.detail ?? ""),
      };
    })
    .filter((h) => h.label);

  if (!habits.length) return undefined;

  const milestones = (Array.isArray(p.milestones) ? p.milestones : [])
    .slice(0, 4)
    .map((row) => {
      const m = row as Record<string, unknown>;
      return {
        day: Math.min(365, Math.max(1, Math.round(Number(m.day) || 7))),
        label: String(m.label ?? ""),
        body: String(m.body ?? ""),
      };
    })
    .filter((m) => m.label)
    .sort((a, b) => a.day - b.day);

  return {
    title: String(p.title ?? fallbackTitle),
    subtitle: String(p.subtitle ?? ""),
    weeks,
    habits,
    milestones,
  };
}

