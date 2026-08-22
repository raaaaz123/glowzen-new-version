"use client";

import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useGlow } from "@/lib/state/GlowContext";
import { computeStreak, dailyHabits, dateKey, dayTarget, doneOn } from "@/lib/streak";
import { cn } from "@/lib/utils";
import type { RoutineHabit } from "@/lib/types";

/**
 * The daily loop. Appearance changes weekly at best, so the thing that has to
 * happen every day is small: three habits and a streak that survives one miss
 * being half-done.
 */
export function RoutineCard({
  habits,
  compact,
}: {
  habits: RoutineHabit[];
  compact?: boolean;
}) {
  const { habitLog, toggleHabit } = useGlow();

  const today = dateKey();
  const daily = dailyHabits(habits);
  const target = dayTarget(habits);
  const doneToday = doneOn(habitLog, today, habits);
  const { current, longest } = computeStreak(habitLog, habits);
  const complete = doneToday >= target;

  return (
    <Card className={cn("p-5", complete && "border-champagne/35")}>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl transition-colors",
            current > 0 ? "bg-champagne/12 text-champagne" : "bg-raised text-faint",
          )}
        >
          <Flame className="size-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">
            {current > 0 ? `${current}-day streak` : "Start your streak"}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {complete
              ? "Today's done. Come back tomorrow."
              : `${doneToday} of ${target} today${longest > current ? ` · best ${longest}` : ""}`}
          </p>
        </div>

        {compact && (
          <Link href="/plan" className="shrink-0 text-[13px] text-champagne">
            Open
          </Link>
        )}
      </div>

      <ul className="mt-4 space-y-1 border-t border-line pt-3">
        {daily.map((habit) => {
          const done = (habitLog[today] ?? []).includes(habit.id);
          return (
            <li key={habit.id}>
              <button
                onClick={() => toggleHabit(habit.id, !done)}
                className="flex w-full items-start gap-3 rounded-xl py-2.5 text-left transition-colors hover:bg-cream/[.03]"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                    done ? "border-champagne bg-champagne text-on-accent" : "border-line",
                  )}
                >
                  {done && <Check className="size-3" strokeWidth={3.2} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[14.5px]",
                      done ? "text-faint line-through" : "text-cream/90",
                    )}
                  >
                    {habit.label}
                  </span>
                  {!compact && (
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                      {habit.detail}
                    </span>
                  )}
                </span>
                <span className="mt-1 shrink-0 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                  {habit.when}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
