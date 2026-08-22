import { currentUid } from "@/lib/firebase/auth";
import { paths, readDoc, writeDoc } from "@/lib/firebase/firestore";
import type {
  Analysis,
  CheckIn,
  Gender,
  GlowPlan,
  Milestone,
  PlanWeek,
  PlanTemplate,
  ProgressReport,
  RoutineHabit,
} from "@/lib/types";
import { getAnalyses } from "./analysisService";
import { getIdToken } from "@/lib/firebase/auth";
import { getUserDoc } from "./userService";
import { EmptyError } from "@/lib/emptyError";

interface PlanDoc {
  /** taskId → completed. Overlays the generated plan. */
  tasks: Record<string, boolean>;
  startedAt: string | null;
  /** The generated plan, kept so it doesn't get rewritten on every visit. */
  template: PlanTemplate | null;
  /** Which analysis it was built from, so a new scan rebuilds it. */
  analysisId: string | null;
}

const EMPTY_PLAN_DOC: PlanDoc = {
  tasks: {},
  startedAt: null,
  template: null,
  analysisId: null,
};

const DAY = 24 * 60 * 60_000;

const shortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Thrown when there's no analysis yet — the caller shows an empty state. */
export class NoPlanError extends EmptyError {
  constructor(message = "Run an analysis first and your plan gets built from it.") {
    super(message, { label: "Start your analysis", href: "/analyze" });
  }
}

/**
 * The plan is whatever the last analysis generated for this person, with their
 * own completion and start date layered over it. There is no template — two
 * users never get the same plan.
 */
export async function getPlan(gender: Gender | null): Promise<GlowPlan> {
  const uid = await currentUid();
  const [analyses, stored] = await Promise.all([
    getAnalyses(1),
    readDoc<PlanDoc>(paths.plan(uid), EMPTY_PLAN_DOC),
  ]);

  const analysis = analyses[0];
  if (!analysis) throw new NoPlanError();

  // Generated once per analysis and kept. A new scan rebuilds it.
  let template = stored.analysisId === analysis.id ? stored.template : null;
  if (!template) {
    template = await requestPlan(analysis);
    await writeDoc(paths.plan(uid), {
      ...stored,
      template,
      analysisId: analysis.id,
    });
  }

  const startedAt = stored.startedAt ? new Date(stored.startedAt) : null;
  const dayIndex = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / DAY) : -1;
  const currentWeek = dayIndex < 0 ? 0 : Math.floor(dayIndex / 7) + 1;

  const weeks: PlanWeek[] = template.weeks.map((w) => ({
    week: w.week,
    phase: w.phase,
    title: w.title,
    focus: w.focus,
    state:
      currentWeek === 0
        ? w.week === 1
          ? "active"
          : "upcoming"
        : w.week < currentWeek
          ? "done"
          : w.week === currentWeek
            ? "active"
            : "upcoming",
    tasks: w.tasks.map((label, i) => {
      const id = `w${w.week}-t${i}`;
      return { id, label, done: stored.tasks[id] ?? false };
    }),
  }));

  const habits: RoutineHabit[] = template.habits.map((h, i) => ({
    id: `habit-${i}-${h.when}`,
    label: h.label,
    when: h.when,
    detail: h.detail,
  }));

  const checkIns: CheckIn[] = template.weeks.map((w) => {
    const due = startedAt ? new Date(startedAt.getTime() + (w.week - 1) * 7 * DAY) : null;
    return {
      week: w.week,
      label: `Week ${w.week}`,
      photoKey: null,
      photo: null,
      dateLabel: due ? shortDate(due) : "Not started",
      state:
        currentWeek === 0
          ? "upcoming"
          : w.week < currentWeek
            ? "done"
            : w.week === currentWeek
              ? "due"
              : "upcoming",
    };
  });

  const milestones: Milestone[] = template.milestones.map((m, i, all) => {
    const reached = dayIndex >= 0 && dayIndex + 1 >= m.day;
    const firstUnreached = all.findIndex((x) => !(dayIndex >= 0 && dayIndex + 1 >= x.day));
    return {
      day: m.day,
      label: m.label,
      body: m.body,
      state: reached ? "done" : i === firstUnreached ? "next" : "locked",
    };
  });

  return {
    id: `plan_${analysis.id}`,
    title: template.title,
    subtitle: template.subtitle,
    startedLabel: startedAt ? `Started ${shortDate(startedAt)}` : "Not started yet",
    weeks,
    habits,
    checkIns,
    milestones,
  };
}

export async function setTaskDone(taskId: string, done: boolean) {
  const uid = await currentUid();
  const current = await readDoc<PlanDoc>(paths.plan(uid), EMPTY_PLAN_DOC);
  return writeDoc(paths.plan(uid), {
    ...current,
    tasks: { ...current.tasks, [taskId]: done },
  });
}

export async function startPlan() {
  const uid = await currentUid();
  const current = await readDoc<PlanDoc>(paths.plan(uid), EMPTY_PLAN_DOC);
  return writeDoc(paths.plan(uid), {
    ...current,
    startedAt: current.startedAt ?? new Date().toISOString(),
  });
}

/** Thrown when there aren't two scans yet, so there is nothing to compare. */
export class NotEnoughScansError extends EmptyError {
  constructor(
    message = "Take a second photo and this compares it against your first.",
    readonly scans = 0,
  ) {
    super(message, { label: "Take a new scan", href: "/analyze" });
  }
}

/**
 * Real before/after, derived from the user's two most recent analyses. With
 * fewer than two there is genuinely nothing to show, so this throws rather
 * than inventing movement.
 */
export async function getProgress(_gender: Gender | null): Promise<ProgressReport> {
  const analyses = await getAnalyses(12);
  if (analyses.length < 2) throw new NotEnoughScansError(undefined, analyses.length);

  const after = analyses[0];
  const before = analyses[analyses.length - 1];

  const metrics = before.scores
    .map((from) => {
      const to = after.scores.find((s) => s.key === from.key);
      return to ? { key: from.key, label: from.label, from: from.value, to: to.value } : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const moved = metrics.reduce((sum, m) => sum + (m.to - m.from), 0);
  const uid = await currentUid();
  const plan = await readDoc<PlanDoc>(paths.plan(uid), EMPTY_PLAN_DOC);
  const doneCount = Object.values(plan.tasks).filter(Boolean).length;
  const totalTasks = after.plan?.weeks.reduce((n, w) => n + w.tasks.length, 0) ?? 0;

  return {
    completion: totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0,
    headline:
      moved > 0
        ? `Your scores are up ${moved} points across ${metrics.length} areas.`
        : "Here's how your latest scan compares to your first.",
    metrics,
    before: snapshot(before, "First scan"),
    after: snapshot(after, "Latest scan"),
    timeline: analyses
      .slice()
      .reverse()
      .map((a, i) => ({
        label: i === 0 ? "First scan" : `Scan ${i + 1}`,
        date: shortDate(new Date(a.createdAt)),
        note: a.opportunities?.[0]?.title ?? "",
        done: true,
      })),
  };
}

const snapshot = (a: Analysis, dayLabel: string) => ({
  id: a.id,
  dayLabel,
  dateLabel: shortDate(new Date(a.createdAt)),
  photo: a.photo,
});


/**
 * One generation per analysis, even if several callers ask at once. Without
 * this, concurrent mounts all miss the Firestore cache and each pays for its
 * own plan.
 */
const inFlight = new Map<string, Promise<PlanTemplate>>();

function requestPlan(analysis: Analysis): Promise<PlanTemplate> {
  const existing = inFlight.get(analysis.id);
  if (existing) return existing;

  const promise = generatePlan(analysis).finally(() => {
    inFlight.delete(analysis.id);
  });
  inFlight.set(analysis.id, promise);
  return promise;
}

async function generatePlan(analysis: Analysis): Promise<PlanTemplate> {
  const token = await getIdToken();
  if (!token) throw new NoPlanError("We couldn't start a session. Try again.");

  const user = await getUserDoc();
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      answers: user.answers,
      summary: analysis.summary,
      opportunities: analysis.opportunities.map((o) => ({
        title: o.title,
        recommendation: o.recommendation,
        steps: o.steps,
      })),
      topHairstyle: analysis.hairstyles?.[0]
        ? {
            name: analysis.hairstyles[0].name,
            maintenance: analysis.hairstyles[0].maintenance,
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Your plan didn't come back.");
  }

  const { plan } = (await response.json()) as { plan: PlanTemplate };
  return plan;
}
