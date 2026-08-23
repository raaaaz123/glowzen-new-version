"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Crown,
  Lock,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/I18nContext";
import { currentUid } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";
import type { Vars } from "@/lib/i18n/translate";

/* ────────────────────────────────────────────────── pricing ─── */

type PlanKey = "trial" | "monthly" | "yearly" | "yearlyExit";

/**
 * Amounts stay here rather than in the dictionaries: they are what Polar
 * actually charges, in USD, and duplicating them across seven languages is
 * seven chances to quote a price the checkout won't honour. Only the wording
 * around them ("/month", "Save 64%") is translated.
 */
export const PRICE = {
  trial: "$0.99",
  trialPerDay: "$0.33",
  monthly: "$6.99",
  yearly: "$29.99",
  yearlyList: "$83.88",
  yearlyPerMonth: "$2.50",
  exit: "$19.99",
  exitPerMonth: "$1.67",
} as const;

const TRIAL_DAYS = 3;
const YEARLY_SAVING = 64;
const EXIT_SAVING = 76;
export const RATING = 4.9;
export const REVIEWS = 2847;

interface PlanDef {
  key: PlanKey;
  label: string;
  price: string;
  period: string;
  note?: string;
  badge?: string;
  perMonth?: string;
  strikethrough?: string;
  savings?: string;
  popular?: boolean;
}

type T = (path: string, vars?: Vars) => string;

function buildPlans(t: T): PlanDef[] {
  return [
    {
      key: "monthly",
      label: t("paywall.monthlyLabel"),
      price: PRICE.monthly,
      period: t("paywall.periodMonth"),
      perMonth: t("paywall.perMonth", { amount: PRICE.monthly }),
    },
    {
      key: "yearly",
      label: t("paywall.yearlyLabel"),
      price: PRICE.yearly,
      period: t("paywall.periodYear"),
      strikethrough: PRICE.yearlyList,
      savings: t("paywall.save", { pct: YEARLY_SAVING }),
      perMonth: t("paywall.perMonth", { amount: PRICE.yearlyPerMonth }),
      popular: true,
      badge: t("paywall.badgeBestValue"),
    },
  ];
}

function buildExitPlan(t: T): PlanDef {
  return {
    key: "yearlyExit",
    label: t("paywall.exitLabel"),
    price: PRICE.exit,
    period: t("paywall.periodYear"),
    strikethrough: PRICE.yearlyList,
    savings: t("paywall.off", { pct: EXIT_SAVING }),
    perMonth: t("paywall.perMonth", { amount: PRICE.exitPerMonth }),
    badge: t("paywall.badgeExclusive"),
  };
}

const BENEFIT_KEYS = [
  "paywall.benefits.analysis",
  "paywall.benefits.hair",
  "paywall.benefits.beardMakeup",
  "paywall.benefits.plan",
  "paywall.benefits.previews",
  "paywall.benefits.rescans",
];

const PROOF_KEYS = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"].map(
  (n) => `paywall.proof.${n}`,
);

/* ────────────────────────────────────────────────── social proof ─── */

function useRotatingProof(t: T) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % PROOF_KEYS.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return t(PROOF_KEYS[index]);
}

/* ────────────────────────────────────────────────── countdown ─── */

function useCountdown(hours: number) {
  const end = useRef(Date.now() + hours * 3600_000);
  const [left, setLeft] = useState(hours * 3600);
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((end.current - Date.now()) / 1000));
      setLeft(s);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const hh = String(Math.floor(left / 3600)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/* ────────────────────────────────────────────────── component ─── */

export function Paywall({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [loading, setLoading] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [exitShownOnce, setExitShownOnce] = useState(false);
  const proof = useRotatingProof(t);
  const countdown = useCountdown(24);

  const plans = useMemo(() => buildPlans(t), [t]);
  const exitPlan = useMemo(() => buildExitPlan(t), [t]);

  /**
   * The decorative avatars spell out the first four names, so read them off
   * the translated list — Latin initials next to Arabic or Japanese names
   * would look like a rendering bug.
   */
  const initials = useMemo(
    () => PROOF_KEYS.slice(0, 4).map((key) => Array.from(t(key))[0] ?? "•"),
    [t],
  );

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleClose = useCallback(() => {
    if (!exitShownOnce) {
      setShowExit(true);
      setExitShownOnce(true);
      return;
    }
    setShowExit(false);
    onClose();
  }, [exitShownOnce, onClose]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleCheckout = useCallback(async (plan: PlanKey) => {
    setLoading(true);
    try {
      const uid = await currentUid();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, uid }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("[paywall] checkout error:", data.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("[paywall] checkout failed:", err);
      setLoading(false);
    }
  }, []);

  if (!open) return null;

  /* ── exit offer overlay ─── */
  if (showExit) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="animate-fade absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div className="animate-rise relative z-10 mx-4 max-w-sm rounded-[2rem] border border-champagne/30 bg-surface p-6 text-center shadow-pop">
          {/* Glow */}
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-champagne/15 blur-[60px]" />

          <div className="relative">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-champagne/15">
              <Sparkles className="size-7 text-champagne" />
            </div>
            <h3 className="type-display text-[1.5rem]">{t("paywall.exitTitle")}</h3>
            <p className="mt-2 text-[14px] text-muted">{t("paywall.exitSubtitle")}</p>

            <PlanCard
              plan={exitPlan}
              selected={true}
              onSelect={() => {}}
              className="mt-5"
            />

            <Button
              fullWidth
              size="lg"
              loading={loading}
              className="mt-5"
              onClick={() => handleCheckout("yearlyExit")}
            >
              <Crown className="size-4" aria-hidden />
              {t("paywall.exitCta", { pct: EXIT_SAVING, amount: PRICE.exit })}
            </Button>

            <button
              onClick={() => {
                setShowExit(false);
                onClose();
              }}
              className="mt-4 block w-full text-center text-[13px] text-faint underline-offset-4 transition-colors hover:text-muted hover:underline"
            >
              {t("paywall.exitDecline")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── main paywall ─── */
  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* backdrop */}
      <button
        className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-label={t("paywall.close")}
      />

      {/* panel */}
      <div className="animate-sheet no-scrollbar relative z-10 mt-auto flex max-h-[94svh] w-full flex-col overflow-y-auto rounded-t-sheet border border-line bg-surface sm:mx-auto sm:my-auto sm:max-w-lg sm:animate-rise sm:rounded-sheet">
        {/* drag pill (mobile) */}
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-cream/15 sm:hidden" />

        {/* close */}
        <button
          onClick={handleClose}
          className="absolute end-4 top-4 z-20 rounded-full p-2 text-faint transition-colors hover:bg-cream/5 hover:text-cream"
          aria-label={t("paywall.close")}
        >
          <X className="size-5" />
        </button>

        <div className="px-6 pt-5 pb-6">
          {/* ── header ─── */}
          <div className="text-center">
            <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-linear-to-br from-champagne/20 to-champagne/5">
              <Crown className="size-8 text-champagne" />
            </div>
            <h2 className="type-display text-[clamp(1.5rem,6vw,2rem)]">
              {t("paywall.title")}
            </h2>
            <p className="mt-2 text-[14px] text-muted">{t("paywall.subtitle")}</p>
          </div>

          {/* ── countdown ─── */}
          <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-champagne/8 px-4 py-3 text-[13px]">
            <Zap className="size-4 text-champagne" aria-hidden />
            <span className="text-muted">{t("paywall.expiresIn")}</span>
            {/* The clock reads left-to-right in every language. */}
            <span className="font-mono font-medium text-champagne tabular-nums" dir="ltr">
              {countdown}
            </span>
          </div>

          {/* ── social proof ─── */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-muted">
            <div className="flex -space-x-2">
              {initials.map((letter, i) => (
                <span
                  key={i}
                  className="inline-grid size-6 place-items-center rounded-full border-2 border-surface bg-champagne/20 text-[9px] font-bold text-champagne"
                >
                  {letter}
                </span>
              ))}
            </div>
            <span className="animate-fade" key={proof}>
              {t("paywall.proofLine", { name: proof })}
            </span>
          </div>

          {/* ── what you get ─── */}
          <div className="mt-6">
            <p className="eyebrow mb-3 text-center">{t("paywall.whatYouGet")}</p>
            <div className="space-y-2.5">
              {BENEFIT_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-champagne/15 text-champagne">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] text-cream/90">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── pricing cards ─── */}
          <div className="mt-7 space-y-3">
            <p className="eyebrow mb-3 text-center">{t("paywall.choosePlan")}</p>
            {plans.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                selected={selected === plan.key}
                onSelect={() => setSelected(plan.key)}
              />
            ))}
          </div>

          {/* ── CTA ─── */}
          <Button
            fullWidth
            size="lg"
            loading={loading}
            className="mt-6"
            onClick={() => handleCheckout(selected)}
          >
            {loading ? (
              t("paywall.ctaLoading")
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                {t("paywall.cta")}
                <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </>
            )}
          </Button>

          {/* ── trust ─── */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-faint">
            <span className="flex items-center gap-1">
              <Lock className="size-3" /> {t("paywall.securePayment")}
            </span>
            <span>•</span>
            <span>{t("paywall.cancelAnytime")}</span>
            <span>•</span>
            <span>{t("paywall.guarantee")}</span>
          </div>

          {/* ── rating ─── */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="size-4 text-champagne"
                fill="currentColor"
              />
            ))}
            <span className="ms-1 text-[12px] text-muted">
              {t("paywall.rating", {
                score: formatNumber(RATING, { minimumFractionDigits: 1 }),
                count: formatNumber(REVIEWS),
              })}
            </span>
          </div>

          <div className="safe-b pb-2" />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────── plan card ─── */

function PlanCard({
  plan,
  selected,
  onSelect,
  className,
}: {
  plan: PlanDef;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-2xl border p-4 text-start transition-all duration-200",
        selected
          ? "border-champagne/50 bg-champagne/8 shadow-[0_0_20px_-4px_var(--accent-glow)]"
          : "border-line bg-raised/50 hover:border-champagne/25",
        plan.popular && !selected && "border-champagne/20",
        className,
      )}
    >
      {/* badge */}
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-2.5 end-4 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-[0.12em] uppercase",
            plan.popular || plan.key === "yearlyExit"
              ? "bg-champagne text-on-accent"
              : "bg-raised text-champagne border border-champagne/30",
          )}
        >
          {plan.badge}
        </span>
      )}

      <div className="flex items-center gap-3">
        {/* radio */}
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
            selected
              ? "border-champagne bg-champagne"
              : "border-faint/60",
          )}
        >
          {selected && (
            <Check className="size-3 text-on-accent" strokeWidth={3} />
          )}
        </span>

        {/* text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-medium">{plan.label}</span>
            {plan.savings && (
              <span className="rounded-md bg-champagne/15 px-1.5 py-0.5 text-[10px] font-bold text-champagne">
                {plan.savings}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            {plan.strikethrough && (
              <span className="text-[13px] text-faint line-through">
                {plan.strikethrough}
              </span>
            )}
            <span className="type-display text-[1.3rem]">{plan.price}</span>
            <span className="text-[13px] text-muted">{plan.period}</span>
          </div>
          {plan.note && (
            <p className="mt-1 text-[11px] text-faint">{plan.note}</p>
          )}
        </div>

        {/* per-month */}
        {plan.perMonth && (
          <span className="shrink-0 rounded-lg bg-cream/5 px-2 py-1 text-[11px] text-muted">
            {plan.perMonth}
          </span>
        )}
      </div>
    </button>
  );
}

/* ── inline paywall prompt (for gated pages) ─── */

export function PaywallPrompt({
  onOpen,
  message,
}: {
  onOpen: () => void;
  /** Already translated by the caller — each gated page names its own thing. */
  message?: string;
}) {
  const t = useI18n().t;
  return (
    <div className="mt-8 flex flex-col items-center gap-4 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-champagne/10">
        <Lock className="size-7 text-champagne" />
      </div>
      <div>
        <p className="text-[15px] font-medium">
          {message || t("paywall.promptDefault")}
        </p>
        <p className="mt-1 text-[13px] text-muted">{t("paywall.promptSub")}</p>
      </div>
      <Button size="md" onClick={onOpen}>
        <Crown className="size-4" aria-hidden />
        {t("paywall.promptCta")}
      </Button>
    </div>
  );
}
