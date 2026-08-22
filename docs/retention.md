# Retention: the 60-day loop

The problem with an appearance app is that the payoff is slow and the app has
nothing to do in between. Three loops at three speeds, so there's always a
reason to open it.

## Daily — the routine

Habits come from the generated plan (`/api/plan`), sized to the minutes the user said they'd spend, shown on Home
as a compact card and on Plan in full. A streak counts a day once **half** the
daily habits are ticked, and today being unfinished doesn't break it — otherwise
everyone sees zero until bedtime.

Deliberately small. Nobody's appearance changes daily, so a long daily checklist
is a chore people quit. Two ticks is the bar.

Streak maths lives in `lib/streak.ts`; the log is `{ "YYYY-MM-DD": habitId[] }`
on local calendar days, persisted with the rest of the session.

## Weekly — the check-in

Eight photos, one a week, on the Progress screen. Each one adds a frame to the
before/after. This is the loop that actually holds people: the comparison only
exists if you keep taking the photo, and it gets more compelling every week.

## Monthly — the two phases

The plan is 60 days, split:

- **Phase one, days 1–30** — the visible wins. Cut, grooming, fit.
- **Phase two, days 31–60** — what compounds. Consistency, details, palette,
  and the 60-day reveal.

Phase two stays locked until phase one is complete. Finishing something and then
being handed something new beats one undifferentiated 60-day list, and it means
day 31 has an event on it rather than being the day the plan runs out.

Milestones sit above both (`MILESTONES`): day 7, 14, 30 and 60, with the 60-day
reveal — all eight photos side by side — as the thing worth staying for.

## What isn't built

- Notifications. The weekly check-in needs a nudge to actually happen; right now
  nothing reminds anyone.
- Check-in state is derived from the plan start date. Taking a week-N photo doesn't yet write to the
  check-in record — it needs `checkIns` persisted per user in Firestore.
- The day-60 reveal is a milestone card, not a generated artefact.
