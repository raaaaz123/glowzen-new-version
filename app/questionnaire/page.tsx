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
  resolveChoices,
} from "@/lib/data/questions";
import { useGlow } from "@/lib/state/GlowContext";
import { useT } from "@/lib/i18n/I18nContext";
import { saveAnswers } from "@/services/userService";
import type { AgeRange, Gender, QuestionnaireAnswers } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOTAL = 8;

/** Steps that move on by themselves once they're answered. */
const AUTO_ADVANCE = new Set([1, 2, 3, 4, 5, 7]);

/** Shown once a step is answered — the app reacting rather than just recording. */
const reactionKey = (step: number) => `questionnaire.reaction${step}`;

export default function QuestionnairePage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { answers, setAnswer } = useGlow();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const gender = answers.gender ?? "neutral";

  // Resolved once per render rather than inside each step, so switching
  // language re-labels every list in the same pass.
  const choices = useMemo(
    () => ({
      gender: resolveChoices(t, "gender", GENDER_CHOICES),
      age: resolveChoices(t, "age", AGE_CHOICES),
      focus: resolveChoices(t, "focus", FOCUS_CHOICES[gender]),
      aesthetic: resolveChoices(t, "aesthetic", AESTHETIC_CHOICES[gender]),
      concern: resolveChoices(t, "concern", CONCERN_CHOICES[gender]),
      hairType: resolveChoices(t, "hairType", HAIR_TYPE_CHOICES),
      hairLength: resolveChoices(t, "hairLength", HAIR_LENGTH_CHOICES[gender]),
      skinType: resolveChoices(t, "skinType", SKIN_TYPE_CHOICES),
      skinConcern: resolveChoices(t, "skinConcern", SKIN_CONCERN_CHOICES),
      dailyMinutes: resolveChoices(t, "dailyMinutes", DAILY_MINUTES_CHOICES),
      commitment: resolveChoices(t, "commitment", COMMITMENT_CHOICES),
      priority: resolveChoices(t, "priority", PRIORITY_CHOICES),
    }),
    [t, gender],
  );

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
      toast(t("questionnaire.saveFailed"), "error");
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
              aria-label={t("common.goBack")}
              className="-ms-2 grid size-10 shrink-0 place-items-center rounded-full text-cream transition-colors hover:bg-raised"
            >
              <ChevronLeft className="size-5 rtl:-scale-x-100" />
            </button>
            <span className="eyebrow ms-auto">{t("questionnaire.buildingProfile")}</span>
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
            <Step title={t("questionnaire.step1Title")} subtitle={t("questionnaire.step1Subtitle")}>
              <Field legend={t("questionnaire.step1LegendGender")}>
                <div className="space-y-2.5">
                  {choices.gender.map((c) => (
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
              <Field legend={t("questionnaire.step1LegendAge")} className="mt-7">
                <Chips>
                  {choices.age.map((c) => (
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
            <Step title={t("questionnaire.step2Title")} subtitle={t("questionnaire.step2Subtitle")}>
              <List
                choices={choices.focus}
                value={answers.focus}
                onChange={(id) => pick("focus", id)}
              />
            </Step>
          )}

          {step === 3 && (
            <Step title={t("questionnaire.step3Title")} subtitle={t("questionnaire.step3Subtitle")}>
              <div className="grid grid-cols-2 gap-2.5">
                {choices.aesthetic.map((c) => (
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
              title={t("questionnaire.step4Title")}
              subtitle={t("questionnaire.step4Subtitle")}
            >
              <List
                choices={choices.concern}
                value={answers.concern}
                onChange={(id) => pick("concern", id)}
              />
            </Step>
          )}

          {step === 5 && (
            <Step
              title={t("questionnaire.step5Title")}
              subtitle={t("questionnaire.step5Subtitle")}
            >
              <Field legend={t("questionnaire.step5LegendTexture")}>
                <Chips>
                  {choices.hairType.map((c) => (
                    <OptionChip
                      key={c.id}
                      label={c.label}
                      selected={answers.hairType === c.id}
                      onSelect={() => pick("hairType", c.id)}
                    />
                  ))}
                </Chips>
              </Field>
              <Field legend={t("questionnaire.step5LegendLength")} className="mt-7">
                <Chips>
                  {choices.hairLength.map((c) => (
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
              title={t("questionnaire.step6Title")}
              subtitle={t("questionnaire.step6Subtitle")}
            >
              <Field legend={t("questionnaire.step6LegendType")}>
                <Chips>
                  {choices.skinType.map((c) => (
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
                legend={t("questionnaire.step6LegendConcerns", { max: MAX_SKIN_CONCERNS })}
                className="mt-7"
                count={`${answers.skinConcerns.length}/${MAX_SKIN_CONCERNS}`}
              >
                <div className="grid grid-cols-2 gap-2.5">
                  {choices.skinConcern.map((c) => (
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
            <Step title={t("questionnaire.step7Title")} subtitle={t("questionnaire.step7Subtitle")}>
              <Field legend={t("questionnaire.step7LegendSize")}>
                <List
                  choices={choices.commitment}
                  value={answers.commitment}
                  onChange={(id) => pick("commitment", id)}
                />
              </Field>
              <Field legend={t("questionnaire.step7LegendTime")} className="mt-7">
                <Chips>
                  {choices.dailyMinutes.map((c) => (
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
            <Step title={t("questionnaire.step8Title")} subtitle={t("questionnaire.step8Subtitle")}>
              <List
                choices={choices.priority}
                value={answers.priority}
                onChange={(id) => pick("priority", id)}
              />
            </Step>
          )}

          {canContinue && (
            <p className="animate-rise mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-champagne">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t(reactionKey(step))}
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
            {t("common.back")}
          </Button>
          <Button fullWidth disabled={!canContinue} loading={saving} onClick={next}>
            {step === TOTAL ? t("questionnaire.finish") : t("common.continue")}
            {step < TOTAL && <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />}
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
