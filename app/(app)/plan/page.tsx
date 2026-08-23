"use client";

import { useMemo, useState } from "react";
import { Check, Flag, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImpactMeter } from "@/components/ui/ProgressRing";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, NothingYet } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { RoutineCard } from "@/components/glow/RoutineCard";
import { useAsync } from "@/lib/useAsync";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { getPlan, setTaskDone, startPlan } from "@/services/progressService";
import { cn } from "@/lib/utils";

export default function PlanPage() {
  const toast = useToast();
  const t = useT();
  const { gender, taskState, toggleTask } = useGlow();
  const { data, loading, error, empty, reload } = useAsync(() => getPlan(gender), [gender]);
  const [started, setStarted] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const weeks = useMemo(
    () =>
      data?.weeks.map((w) => ({
        ...w,
        tasks: w.tasks.map((t) => ({ ...t, done: taskState[t.id] ?? t.done })),
      })) ?? [],
    [data, taskState],
  );

  const total = weeks.reduce((n, w) => n + w.tasks.length, 0);
  const done = weeks.reduce((n, w) => n + w.tasks.filter((t) => t.done).length, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;

  const phaseOne = weeks.filter((w) => w.phase === 1);
  const phaseTwo = weeks.filter((w) => w.phase === 2);
  // Phase two opens when the first month is finished — that's the whole point
  // of splitting it: something to finish, then something new to start.
  const phaseTwoOpen = phaseOne.length > 0 && phaseOne.every((w) => w.tasks.every((t) => t.done));

  async function onToggle(id: string, next: boolean) {
    setPending(id);
    toggleTask(id, next); // optimistic
    try {
      await setTaskDone(id, next);
      if (next) toast(t("plan.taskDone"));
    } catch {
      toggleTask(id, !next);
      toast(t("common.couldntSave"), "error");
    } finally {
      setPending(null);
    }
  }

  return (
    <main>
      <TopBar back={false} title={t("plan.title")} />

      {empty && (
        <div className="mt-8">
          <NothingYet empty={empty} title={t("plan.emptyTitle")} />
        </div>
      )}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading && !error && !empty && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
      )}

      {data && (
        <div className="animate-rise">
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">{data.subtitle}</p>

          <Card className="mt-6 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="eyebrow mb-1.5">{data.startedLabel}</p>
                <p className="text-[15px]">
                  <span className="type-display text-[1.9rem]">{done}</span>
                  <span className="text-muted">&nbsp;{t("plan.stepsDone", { total })}</span>
                </p>
              </div>
              <span className="font-mono text-[13px] text-champagne">{percent}%</span>
            </div>
            <ImpactMeter value={percent} className="mt-4" />
          </Card>

          <Button
            fullWidth
            className="mt-4"
            variant={started ? "secondary" : "primary"}
            onClick={() => {
              setStarted(true);
              void startPlan();
              toast(t("plan.weekOneStarted"));
            }}
          >
            {started ? t("plan.weekOneInProgress") : t("plan.startWeekOne")}
          </Button>

          <section className="mt-9">
            <SectionHeader eyebrow={t("plan.everyDay")} title={t("plan.yourRoutine")} />
            <RoutineCard habits={data.habits} />
          </section>

          <section className="mt-8">
            <SectionHeader eyebrow={t("plan.aheadOfYou")} title={t("plan.milestones")} />
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:px-0">
              {data.milestones.map((m) => (
                <Card
                  key={m.day}
                  className={cn(
                    "w-52 shrink-0 p-4",
                    m.state === "next" && "border-champagne/40",
                    m.state === "locked" && "opacity-55",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="eyebrow">{t("common.day", { day: m.day })}</span>
                    {m.state === "done" ? (
                      <Check className="size-3.5 text-champagne" strokeWidth={3} aria-hidden />
                    ) : m.state === "next" ? (
                      <Flag className="size-3.5 text-champagne" aria-hidden />
                    ) : (
                      <Lock className="size-3.5 text-faint" aria-hidden />
                    )}
                  </div>
                  <p className="text-[14px] font-medium">{m.label}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted">{m.body}</p>
                </Card>
              ))}
            </div>
          </section>

          <SectionHeader
            className="mt-10"
            eyebrow={t("plan.phaseOneEyebrow")}
            title={t("plan.phaseOneTitle")}
          />

          <ol className="lg:grid lg:grid-cols-2 lg:gap-5">
            {phaseOne.map((week, i) => {
              const weekDone = week.tasks.every((t) => t.done);
              const locked = week.state === "upcoming" && !started && i > 0;
              return (
                <li key={week.week} className="relative pb-8 ps-8 lg:pb-0 lg:ps-0">
                  {/* connector — only meaningful in the single-column timeline */}
                  {i < phaseOne.length - 1 && (
                    <span
                      className="absolute top-2 bottom-0 start-[7px] w-px bg-line lg:hidden"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "absolute top-1 start-0 size-[15px] rounded-full border-2 lg:hidden",
                      weekDone
                        ? "border-champagne bg-champagne"
                        : week.state === "active"
                          ? "border-champagne bg-ink"
                          : "border-line bg-ink",
                    )}
                    aria-hidden
                  />

                  <Card
                    className={cn(
                      "p-5 lg:mb-5",
                      week.state === "active" && "border-champagne/35",
                      locked && "opacity-55",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow mb-1.5">{t("common.week", { week: week.week })}</p>
                        <h2 className="type-display text-[1.5rem]">
                          {week.title}
                        </h2>
                      </div>
                      {week.state === "active" && (
                        <span className="rounded-full bg-champagne/12 px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-champagne uppercase">
                          {t("common.now")}
                        </span>
                      )}
                      {locked && <Lock className="size-4 shrink-0 text-faint" aria-hidden />}
                    </div>

                    <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{week.focus}</p>

                    <ul className="mt-4 space-y-1">
                      {week.tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            onClick={() => onToggle(task.id, !task.done)}
                            disabled={locked || pending === task.id}
                            className="flex w-full items-center gap-3 rounded-xl py-2.5 text-start transition-colors hover:bg-cream/[.03] disabled:cursor-not-allowed"
                          >
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                                task.done
                                  ? "border-champagne bg-champagne text-on-accent"
                                  : "border-line",
                              )}
                            >
                              {task.done && <Check className="size-3" strokeWidth={3.2} aria-hidden />}
                            </span>
                            <span
                              className={cn(
                                "text-[14.5px]",
                                task.done ? "text-faint line-through" : "text-cream/90",
                              )}
                            >
                              {task.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </li>
              );
            })}
          </ol>

          <SectionHeader
            className="mt-6"
            eyebrow={t("plan.phaseTwoEyebrow")}
            title={t("plan.phaseTwoTitle")}
            action={
              phaseTwoOpen ? undefined : (
                <span className="flex items-center gap-1.5 text-[12px] text-faint">
                  <Lock className="size-3.5" aria-hidden />
                  {t("plan.opensAfterPhaseOne")}
                </span>
              )
            }
          />

          <ol className={cn("lg:grid lg:grid-cols-2 lg:gap-5", !phaseTwoOpen && "opacity-55")}>
            {phaseTwo.map((week) => (
              <li key={week.week} className="mb-4 lg:mb-0">
                <Card className="p-5 lg:mb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow mb-1.5">{t("common.week", { week: week.week })}</p>
                      <h2 className="type-display text-[1.5rem]">{week.title}</h2>
                    </div>
                    {!phaseTwoOpen && <Lock className="size-4 shrink-0 text-faint" aria-hidden />}
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{week.focus}</p>
                  <ul className="mt-4 space-y-1">
                    {week.tasks.map((task) => (
                      <li key={task.id}>
                        <button
                          onClick={() => onToggle(task.id, !task.done)}
                          disabled={!phaseTwoOpen || pending === task.id}
                          className="flex w-full items-center gap-3 rounded-xl py-2.5 text-start transition-colors hover:bg-cream/[.03] disabled:cursor-not-allowed"
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                              task.done
                                ? "border-champagne bg-champagne text-on-accent"
                                : "border-line",
                            )}
                          >
                            {task.done && (
                              <Check className="size-3" strokeWidth={3.2} aria-hidden />
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-[14.5px]",
                              task.done ? "text-faint line-through" : "text-cream/90",
                            )}
                          >
                            {task.label}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>

        </div>
      )}
    </main>
  );
}
