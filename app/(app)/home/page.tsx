"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronRight,
  Scissors,
  User,
} from "lucide-react";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { RoutineCard } from "@/components/glow/RoutineCard";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { getAnalysis } from "@/services/analysisService";
import { getPlan, getProgress, setTaskDone } from "@/services/progressService";
import { greetingKey } from "@/lib/utils";
import { stylistWord } from "@/lib/copy";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cachedPreview } from "@/services/transformationService";

/* Local building blocks. The theme is deliberately literal here — the page is
   the trial run for it, so every surface states its own spec value rather than
   inheriting one, which makes the direction easy to read off the markup. */

const SHELL = "rounded-[2.5rem] shadow-soft";
const CARD = `${SHELL} border border-graygreen/30 bg-white`;
/** The one dark surface. Kept separate so it never fights CARD's background. */
const HERO = `${SHELL} bg-charcoal p-6 text-offwhite sm:p-7`;
const NESTED = "rounded-[1.5rem]";
const PRIMARY =
  "inline-flex h-13 items-center justify-center gap-2 rounded-[1.5rem] bg-violet px-6 text-[15px] font-bold text-white shadow-[0_12px_30px_-12px_rgb(99_102_241/.55)] transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50";

/**
 * The week strip. One segment per task in the week, so the shape of the bar
 * says how much work a week actually is — a percentage would hide that a
 * three-task week and a seven-task week are not the same ask.
 */
function WeekStrip({
  total,
  done,
  onCharcoal,
}: {
  total: number;
  done: number;
  onCharcoal?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
            i < done ? "bg-violet" : onCharcoal ? "bg-graygreen/25" : "bg-graygreen/45"
          }`}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const toast = useToast();
  const { t, formatNumber } = useI18n();
  const { gender, photoUrl, photoKey, taskState, toggleTask } = useGlow();
  const [hour, setHour] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => setHour(new Date().getHours()), []);

  const analysis = useAsync(() => getAnalysis(gender), [gender]);
  const plan = useAsync(() => getPlan(gender), [gender]);
  const progress = useAsync(() => getProgress(gender), [gender]);

  const activeWeek = plan.data?.weeks.find((w) => w.state === "active");
  const todayTask = activeWeek?.tasks
    .map((t) => ({ ...t, done: taskState[t.id] ?? t.done }))
    .find((t) => !t.done);

  // Completion across the whole plan, from tasks the user has actually ticked.
  const allTasks = plan.data?.weeks.flatMap((w) => w.tasks) ?? [];
  const planPercent = allTasks.length
    ? Math.round(
        (allTasks.filter((t) => taskState[t.id] ?? t.done).length / allTasks.length) * 100,
      )
    : null;

  // Top matched cut, and its render if one has already been generated.
  const topStyle = analysis.data?.hairstyles?.[0] ?? null;
  const [potential, setPotential] = useState<string | null>(null);
  useEffect(() => {
    if (!topStyle) return;
    let cancelled = false;
    void cachedPreview(topStyle.id, photoKey).then((url) => {
      if (!cancelled) setPotential(url);
    });
    return () => {
      cancelled = true;
    };
  }, [topStyle, photoKey]);

  const weekTotal = activeWeek?.tasks.length ?? 0;
  const weekDone =
    activeWeek?.tasks.filter((t) => taskState[t.id] ?? t.done).length ?? 0;

  async function completeToday() {
    if (!todayTask) return;
    setPending(true);
    toggleTask(todayTask.id, true);
    try {
      await setTaskDone(todayTask.id, true);
      toast(t("home.taskDone"));
    } catch {
      toggleTask(todayTask.id, false);
      toast(t("common.couldntSave"), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="animate-view pb-2">
      {/* ——— greeting */}
      <header className="safe-t flex items-center justify-between gap-3 pb-1 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(2rem,8.5vw,2.5rem)] leading-[1.04] font-black tracking-[-0.022em]">
            {hour === null ? t("home.welcomeBack") : t(greetingKey(hour))}
          </h1>
          {planPercent !== null && (
            <p className="mt-2 text-[14px] font-medium text-charcoal/60">
              {t("home.completion", {
                percent: formatNumber(planPercent),
              })}
            </p>
          )}
        </div>
        <Link href="/profile" aria-label={t("nav.profile")} className="shrink-0">
          {photoUrl ? (
            <ImageFrame
              src={photoUrl}
              alt=""
              ratio="aspect-square"
              className="size-12 rounded-[1.25rem] border border-graygreen/60"
              imgClassName="object-[center_20%]"
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-[1.25rem] border border-graygreen/60 bg-white text-charcoal/50 shadow-soft">
              <User className="size-5" aria-hidden />
            </span>
          )}
        </Link>
      </header>

      {analysis.empty && (
        <section className={`mt-6 ${HERO}`}>
          <p className="sp-label text-graygreen">{t("home.firstStep")}</p>
          <h2 className="mt-3 text-[clamp(1.9rem,7.5vw,2.25rem)] leading-[1.06] font-black tracking-[-0.022em]">
            {t("home.addPhotoTitle")}
          </h2>
          <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-offwhite/65">
            {t("home.addPhotoBody")}
          </p>
          <Link href="/analyze" className={`mt-7 ${PRIMARY}`}>
            {t("home.startAnalysis")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </section>
      )}

      {!analysis.empty && (
        <>
          {/* ——— today: the one charcoal surface on the page, so the thing to
              do next is the thing the eye lands on first */}
          <section className={`mt-6 ${HERO}`}>
            <p className="sp-label text-graygreen">{t("home.todaysFocus")}</p>

            {plan.loading && <Skeleton className="mt-4 h-9 w-2/3 bg-white/10" />}

            {plan.error && (
              <p className="mt-3 text-[14.5px] text-offwhite/70">
                {t("home.planFailed")}{" "}
                <button
                  onClick={plan.reload}
                  className="font-bold underline underline-offset-4"
                >
                  {t("common.tryAgain")}
                </button>
              </p>
            )}

            {plan.data && (
              <>
                <h2 className="mt-3 text-[clamp(1.9rem,7.5vw,2.25rem)] leading-[1.06] font-black tracking-[-0.022em] text-balance">
                  {todayTask ? todayTask.label : t("home.weekOneDone")}
                </h2>

                <div className="mt-6">
                  <WeekStrip total={weekTotal} done={weekDone} onCharcoal />
                  <p className="sp-label mt-2.5 text-graygreen">
                    {t("home.tasksThisWeek", { done: weekDone, total: weekTotal })}
                  </p>
                </div>

                {/* Flex-basis rather than a breakpoint: the pair sits on one row
                    wherever it fits and each goes full width where it doesn't. */}
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {todayTask ? (
                    <button
                      onClick={completeToday}
                      disabled={pending}
                      className={`flex-1 basis-40 ${PRIMARY}`}
                    >
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                      {t("home.markDone")}
                    </button>
                  ) : (
                    <Link href="/plan" className={`flex-1 basis-40 ${PRIMARY}`}>
                      {t("home.openWeekTwo")}
                      <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                    </Link>
                  )}
                  <Link
                    href="/plan"
                    className="inline-flex h-13 flex-1 basis-40 items-center justify-center rounded-[1.5rem] border border-graygreen/30 px-6 text-[15px] font-bold text-offwhite/85 transition-colors hover:border-graygreen/60"
                  >
                    {t("home.seeThePlan")}
                  </Link>
                </div>
              </>
            )}
          </section>

          {/* ——— the daily loop */}
          {plan.data && (
            <section className="mt-5">
              <RoutineCard habits={plan.data.habits} compact />
            </section>
          )}

          {/* ——— opportunities */}
          <section className="mt-9">
            <div className="mb-3.5 flex items-end justify-between gap-4 px-1.5">
              <div>
                <p className="sp-label text-charcoal/55">{t("home.rankedByImpact")}</p>
                <h2 className="mt-2 text-[20px] font-black tracking-[-0.015em]">
                  {t("home.topOpportunities")}
                </h2>
              </div>
              <Link href="/results" className="sp-label pb-1 text-violet-ink">
                {t("home.report")}
              </Link>
            </div>

            {analysis.error && (
              <ErrorState message={analysis.error} onRetry={analysis.reload} />
            )}

            {analysis.loading && <Skeleton className="h-56 w-full rounded-[2.5rem]" />}

            {analysis.data && (
              <div className={`${CARD} p-2.5`}>
                {analysis.data.opportunities.map((op) => (
                  <Link
                    key={op.id}
                    href="/improvements"
                    className={`flex items-center gap-4 p-4 transition-colors hover:bg-offwhite ${NESTED}`}
                  >
                    <span className="w-13 shrink-0 text-[2rem] leading-none font-black tracking-[-0.03em] text-violet tabular-nums">
                      {op.impact}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-balance">
                        {op.title}
                      </span>
                      <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-graygreen/45">
                        <span
                          className="block h-full rounded-full bg-violet transition-[width] duration-1000 ease-out"
                          style={{ width: `${op.impact}%` }}
                        />
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-graygreen rtl:-scale-x-100"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ——— transformation */}
          {topStyle && (
            <section className="mt-9">
              <div className="mb-3.5 px-1.5">
                <p className="sp-label text-charcoal/55">{t("home.previewEyebrow")}</p>
                <h2 className="mt-2 text-[20px] font-black tracking-[-0.015em]">
                  {t("home.transformation")}
                </h2>
              </div>

              <div className={`${CARD} p-2.5`}>
                {photoUrl && potential ? (
                  <div className={`grid grid-cols-2 gap-1 overflow-hidden ${NESTED}`}>
                    <ImageFrame
                      src={photoUrl}
                      alt={t("home.currentLook")}
                      overlay={
                        <span className="sp-label absolute bottom-3 start-3 rounded-full bg-white/85 px-2.5 py-1.5 text-charcoal/70 backdrop-blur-md">
                          {t("common.now")}
                        </span>
                      }
                    />
                    <ImageFrame
                      src={potential}
                      alt={t("home.potentialLook")}
                      overlay={
                        <span className="sp-label absolute end-3 bottom-3 rounded-full bg-violet px-2.5 py-1.5 text-white">
                          {t("common.potential")}
                        </span>
                      }
                    />
                  </div>
                ) : (
                  <div
                    className={`grid place-items-center bg-offwhite px-5 py-10 text-center ${NESTED}`}
                  >
                    <Scissors className="size-5 text-violet" aria-hidden />
                    <p className="mt-3 text-[15px] font-bold">
                      {t(photoUrl ? "home.renderOnPhoto" : "home.addPhotoToSee")}
                    </p>
                    <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-charcoal/55">
                      {t("home.previewsNote")}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-[15px] font-bold">{topStyle.name}</p>
                    <p className="sp-label mt-1.5 text-charcoal/55">
                      {t("common.matchPct", { value: topStyle.match })}
                    </p>
                  </div>
                  <Link
                    href="/styles"
                    className="inline-flex h-10 items-center gap-1.5 rounded-[1.5rem] border border-graygreen px-4 text-[13px] font-bold text-charcoal transition-colors hover:bg-offwhite"
                  >
                    {t("home.openPreview")}
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" strokeWidth={2.5} aria-hidden />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ——— plan snapshot */}
          <section className="mt-9 mb-5">
            <div className="mb-3.5 flex items-end justify-between gap-4 px-1.5">
              <div>
                <p className="sp-label text-charcoal/55">{t("home.weekOne")}</p>
                <h2 className="mt-2 text-[20px] font-black tracking-[-0.015em]">
                  {t("home.yourPlan")}
                </h2>
              </div>
              <Link href="/plan" className="sp-label pb-1 text-violet-ink">
                {t("home.allWeeks")}
              </Link>
            </div>

            {plan.loading && <Skeleton className="h-52 w-full rounded-[2.5rem]" />}

            {plan.data && activeWeek && (
              <div className={`${CARD} p-5 sm:p-6`}>
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={weekTotal ? (weekDone / weekTotal) * 100 : 0}
                    size={64}
                    stroke={6}
                    className="shrink-0"
                  >
                    <Calendar className="size-4 text-violet" aria-hidden />
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-black tracking-[-0.01em]">
                      {activeWeek.title}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-snug text-charcoal/55">
                      {activeWeek.focus}
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 border-t border-graygreen/30 pt-5">
                  {activeWeek.tasks.map((t) => {
                    const done = taskState[t.id] ?? t.done;
                    return (
                      <li key={t.id} className="flex items-center gap-3 text-[14.5px]">
                        <span
                          className={
                            done
                              ? "grid size-5 shrink-0 place-items-center rounded-full bg-violet text-white"
                              : "size-5 shrink-0 rounded-full border border-graygreen"
                          }
                        >
                          {done && (
                            <Check className="size-3" strokeWidth={3.6} aria-hidden />
                          )}
                        </span>
                        <span
                          className={
                            done
                              ? "text-charcoal/35 line-through"
                              : "font-medium text-charcoal/85"
                          }
                        >
                          {t.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <button
            onClick={() => toast(t("home.bookingNotWired"), "info")}
            className="mb-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-[1.5rem] border border-graygreen bg-white text-[15px] font-bold text-charcoal shadow-soft transition-colors hover:bg-offwhite active:scale-[.99]"
          >
            <Scissors className="size-4" aria-hidden />
            {t("home.findStylist", { stylist: stylistWord(t, gender) })}
          </button>
        </>
      )}
    </main>
  );
}
