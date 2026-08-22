import type { RoutineHabit } from "@/lib/types";

/** Local calendar day, not UTC — a streak should follow the user's midnight. */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailyHabits(habits: RoutineHabit[]) {
  return habits.filter((h) => h.when !== "weekly");
}

/** A day counts once you've done at least half of that day's habits. */
export function dayTarget(habits: RoutineHabit[]) {
  return Math.max(1, Math.ceil(dailyHabits(habits).length / 2));
}

export function doneOn(
  log: Record<string, string[]>,
  key: string,
  habits: RoutineHabit[],
) {
  const ids = new Set(dailyHabits(habits).map((h) => h.id));
  return (log[key] ?? []).filter((id) => ids.has(id)).length;
}

/**
 * Counts back from today. Today not being finished yet doesn't break the
 * streak — otherwise every user sees zero until bedtime.
 */
export function computeStreak(
  log: Record<string, string[]>,
  habits: RoutineHabit[],
  today = new Date(),
) {
  const target = dayTarget(habits);
  const counts = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return doneOn(log, dateKey(d), habits) >= target;
  };

  let current = 0;
  let offset = counts(0) ? 0 : 1;
  while (counts(offset)) {
    current += 1;
    offset += 1;
    if (current > 400) break;
  }

  const longest = Object.keys(log).reduce((best, key) => {
    if (doneOn(log, key, habits) < target) return best;
    let run = 0;
    const d = new Date(`${key}T00:00:00`);
    for (let i = 0; i < 400; i += 1) {
      const probe = new Date(d);
      probe.setDate(probe.getDate() - i);
      if (doneOn(log, dateKey(probe), habits) < target) break;
      run += 1;
    }
    return Math.max(best, run);
  }, 0);

  return { current, longest: Math.max(longest, current) };
}
