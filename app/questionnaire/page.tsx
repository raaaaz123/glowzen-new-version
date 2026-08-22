"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OptionCard, OptionChip } from "@/components/ui/OptionCard";
import { StepBar } from "@/components/ui/StepBar";
import { useToast } from "@/components/ui/Toast";
import {
  AESTHETIC_CHOICES,
  AGE_CHOICES,
  COMMITMENT_CHOICES,
  CONCERN_CHOICES,
  DAILY_MINUTES_CHOICES,
  FOCUS_CHOICES,
  GENDER_CHOICES,
  HAIR_LENGTH_CHOICES,
  HAIR_TYPE_CHOICES,
  MAX_SKIN_CONCERNS,
  PRIORITY_CHOICES,
  SKIN_CONCERN_CHOICES,
  SKIN_TYPE_CHOICES,
} from "@/lib/data/questions";
import { useGlow } from "@/lib/state/GlowContext";
import { saveAnswers } from "@/services/userService";
import type { AgeRange, Gender, QuestionnaireAnswers } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOTAL = 8;

/** Steps that move on by themselves once they're answered. */
const AUTO_ADVANCE = new Set([1, 2, 3, 4, 5, 7]);

/** Shown once a step is answered — the app reacting rather than just recording. */
const REACTIONS: Record<number, string> = {
  1: "Got it. That decides which options you see from here.",
  2: "Good — that's where we'll start.",
  3: "Noted. Every recommendation will point there.",
  4: "That goes to the top of your list.",
  5: "That rules out the cuts that wouldn't sit right on you.",
  6: "We'll keep the skincare advice inside that.",
  7: "Nothing we suggest will take longer than that.",
  8: "That's everything. Let's look at your photo.",
};

export default function QuestionnairePage() {
  const router = useRouter();
  const toast = useToast();
  const { answers, setAnswer } = useGlow();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const gender = answers.gender ?? "neutral";

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "auto" });
    setTouched(false);
  }, [step]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return Boolean(answers.gender && answers.ageRange);
      case 2:
        return Boolean(answers.focus);
      case 3:
        return Boolean(answers.aesthetic);
      case 4:
        return Boolean(answers.concern);
      case 5:
        return Boolean(answers.hairType && answers.hairLength);
      case 6:
        return Boolean(answers.skinType && answers.skinConcerns.length);
      case 7:
        return Boolean(answers.commitment && answers.dailyMinutes);
      case 8:
        return Boolean(answers.priority);
      default:
        return false;
    }
  }, [step, answers]);

  // Only auto-advance off the back of a tap on this step — never when the user
  // has come back to change something they already answered.
  useEffect(() => {
    if (!touched || !canContinue || step === TOTAL || !AUTO_ADVANCE.has(step)) return;
    const id = setTimeout(() => setStep((s) => (s === step ? s + 1 : s)), 460);
    return () => clearTimeout(id);
  }, [touched, canContinue, step]);

  const pick = useCallback(
    <K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) => {
      setTouched(true);
      setAnswer(key, value);
    },
    [setAnswer],
  );

  function toggleConcern(id: string) {
    setTouched(true);
    const current = answers.skinConcerns;
    if (id === "none") {
      setAnswer("skinConcerns", current.includes("none") ? [] : ["none"]);
      return;
    }
    const without = current.filter((c) => c !== "none");
    if (without.includes(id)) {
      setAnswer("skinConcerns", without.filter((c) => c !== id));
    } else if (without.length < MAX_SKIN_CONCERNS) {
      setAnswer("skinConcerns", [...without, id]);
    }
  }

  function back() {
    if (step === 1) router.push("/");
    else setStep((s) => s - 1);
  }

  async function next() {
    if (step < TOTAL) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    try {
      await saveAnswers(answers as QuestionnaireAnswers);
      router.push("/upload");
    } catch {
      toast("We couldn't save your answers. Try again.", "error");
      setSaving(false);
    }
  }

  const concernsFull = answers.skinConcerns.length >= MAX_SKIN_CONCERNS;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="safe-t shrink-0 px-5 pb-3.5">
        <div className="mx-auto w-full max-w-[560px]">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={back}
              aria-label="Go back"
              className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-cream transition-colors hover:bg-raised"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="eyebrow ml-auto">Building your profile</span>
          </div>
          <StepBar step={step} total={TOTAL} />
        </div>
      </header>

      <div
        ref={scroller}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
      >
        <div key={step} className="animate-rise mx-auto w-full max-w-[560px] pt-4 pb-8">
          {step === 1 && (
            <Step title="First, a bit about you." subtitle="This decides which options you see.">
              <Field legend="You present as">
                <div className="space-y-2.5">
                  {GENDER_CHOICES.map((c) => (
                    <OptionCard
                      key={c.id}
                      label={c.label}
                      hint={c.hint}
                      compact
                      selected={answers.gender === c.id}
                      onSelect={() => pick("gender", c.id as Gender)}
                    />
                  ))}
                </div>
              </Field>
              <Field legend="Age range" className="mt-7">
                <Chips>
                  {AGE_CHOICES.map((c) => (
                    <OptionChip
                      key={c.id}
                      label={c.label}
                      selected={answers.ageRange === c.id}
                      onSelect={() => pick("ageRange", c.id as AgeRange)}
                    />
                  ))}
                </Chips>
              </Field>
            </Step>
          )}

          {step === 2 && (
            <Step title="What are you looking to improve?" subtitle="Pick the one you care about most.">
              <List
                choices={FOCUS_CHOICES[gender]}
                value={answers.focus}
                onChange={(id) => pick("focus", id)}
              />
            </Step>
          )}

          {step === 3 && (
            <Step title="What's your target aesthetic?" subtitle="The look you'd like to move towards.">
              <div className="grid grid-cols-2 gap-2.5">
                {AESTHETIC_CHOICES[gender].map((c) => (
                  <OptionCard
                    key={c.id}
                    label={c.label}
                    compact
                    selected={answers.aesthetic === c.id}
                    onSelect={() => pick("aesthetic", c.id)}
                  />
                ))}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step
              title="What bothers you most right now?"
              subtitle="Be honest — it only changes what we look at first."
            >
              <List
                choices={CONCERN_CHOICES[gender]}
                value={answers.concern}
                onChange={(id) => pick("concern", id)}
              />
            </Step>
          )}

          {step === 5 && (
            <Step
              title="Tell us about your hair."
              subtitle="A photo shows texture, but not what it does when it grows out."
            >
              <Field legend="Texture">
                <Chips>
                  {HAIR_TYPE_CHOICES.map((c) => (
                    <OptionChip
                      key={c.id}
                      label={c.label}
                      selected={answers.hairType === c.id}
                      onSelect={() => pick("hairType", c.id)}
                    />
                  ))}
                </Chips>
              </Field>
              <Field legend="Length right now" className="mt-7">
                <Chips>
                  {HAIR_LENGTH_CHOICES[gender].map((c) => (
                    <OptionChip
                      key={c.id}
                      label={c.label}
                      selected={answers.hairLength === c.id}
                      onSelect={() => pick("hairLength", c.id)}
                    />
                  ))}
                </Chips>
              </Field>
            </Step>
          )}

          {step === 6 && (
            <Step
              title="And your skin."
              subtitle="This one we can't read from a photo, and it changes the advice a lot."
            >
              <Field legend="Skin type">
                <Chips>
                  {SKIN_TYPE_CHOICES.map((c) => (
                    <OptionChip
                      key={c.id}
                      label={c.label}
                      selected={answers.skinType === c.id}
                      onSelect={() => pick("skinType", c.id)}
                    />
                  ))}
                </Chips>
              </Field>
              <Field
                legend={`What bothers you · pick up to ${MAX_SKIN_CONCERNS}`}
                className="mt-7"
                count={`${answers.skinConcerns.length}/${MAX_SKIN_CONCERNS}`}
              >
                <div className="grid grid-cols-2 gap-2.5">
                  {SKIN_CONCERN_CHOICES.map((c) => (
                    <OptionCard
                      key={c.id}
                      label={c.label}
                      compact
                      multi
                      selected={answers.skinConcerns.includes(c.id)}
                      disabled={concernsFull && c.id !== "none"}
                      onSelect={() => toggleConcern(c.id)}
                    />
                  ))}
                </div>
              </Field>
            </Step>
          )}

          {step === 7 && (
            <Step title="How far are you willing to go?" subtitle="We'll keep every recommendation inside this.">
              <Field legend="Size of change">
                <List
                  choices={COMMITMENT_CHOICES}
                  value={answers.commitment}
                  onChange={(id) => pick("commitment", id)}
                />
              </Field>
              <Field legend="Time you'll spend a day" className="mt-7">
                <Chips>
                  {DAILY_MINUTES_CHOICES.map((c) => (
                    <OptionChip
                      key={c.id}
                      label={c.label}
                      selected={answers.dailyMinutes === c.id}
                      onSelect={() => pick("dailyMinutes", c.id)}
                    />
                  ))}
                </Chips>
              </Field>
            </Step>
          )}

          {step === 8 && (
            <Step title="Last one. What matters most?" subtitle="This sets the tone of your plan.">
              <List
                choices={PRIORITY_CHOICES}
                value={answers.priority}
                onChange={(id) => pick("priority", id)}
              />
            </Step>
          )}

          {canContinue && (
            <p className="animate-rise mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-champagne">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {REACTIONS[step]}
            </p>
          )}
        </div>
      </div>

      <footer className="safe-b relative shrink-0 border-t border-line bg-ink px-5 pt-3.5">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-full h-12 bg-linear-to-t from-ink to-transparent"
          aria-hidden
        />
        <div className="mx-auto flex w-full max-w-[560px] gap-3">
          <Button variant="secondary" className="px-6" onClick={back}>
            Back
          </Button>
          <Button fullWidth disabled={!canContinue} loading={saving} onClick={next}>
            {step === TOTAL ? "Let's analyze you" : "Continue"}
            {step < TOTAL && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </div>
      </footer>
    </main>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="type-display text-[clamp(1.65rem,6.4vw,2.4rem)]">{title}</h1>
      <p className="mt-2.5 mb-5 text-[13.5px] leading-relaxed text-muted sm:text-[14px]">
        {subtitle}
      </p>
      {children}
    </section>
  );
}

function Field({
  legend,
  count,
  className,
  children,
}: {
  legend: string;
  count?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <legend className="eyebrow">{legend}</legend>
        {count && <span className="font-mono text-[11px] text-champagne">{count}</span>}
      </div>
      {children}
    </fieldset>
  );
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function List({
  choices,
  value,
  onChange,
}: {
  choices: { id: string; label: string; hint?: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className={cn("space-y-2.5")}>
      {choices.map((c) => (
        <OptionCard
          key={c.id}
          label={c.label}
          hint={c.hint}
          compact
          selected={value === c.id}
          onSelect={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}
