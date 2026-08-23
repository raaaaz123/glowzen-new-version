"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  ImageOff,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { LanguageRow } from "@/components/app/LanguagePicker";
import { Paywall } from "@/components/app/Paywall";
import { useGlow } from "@/lib/state/GlowContext";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  AESTHETIC_CHOICES,
  CONCERN_CHOICES,
  DAILY_MINUTES_CHOICES,
  FOCUS_CHOICES,
  HAIR_LENGTH_CHOICES,
  HAIR_TYPE_CHOICES,
  PRIORITY_CHOICES,
  SKIN_CONCERN_CHOICES,
  SKIN_TYPE_CHOICES,
  labelFor,
} from "@/lib/data/questions";
import { deleteAccount, deleteAllPhotos } from "@/services/userService";
import { cn } from "@/lib/utils";

type Confirm = "photos" | "account" | null;

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { t, shortDate, formatNumber } = useI18n();
  const { answers, gender, photoUrl, setPhotoUrl, reset, subscription, isSubscribed } = useGlow();
  const [privatePhotos, setPrivatePhotos] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const g = gender ?? "neutral";

  const notSet = t("common.notSet");

  const prefs = [
    {
      label: t("profile.prefAesthetic"),
      value: answers.aesthetic
        ? labelFor(t, "aesthetic", AESTHETIC_CHOICES[g], answers.aesthetic)
        : notSet,
    },
    {
      label: t("profile.prefGoal"),
      value: answers.priority
        ? labelFor(t, "priority", PRIORITY_CHOICES, answers.priority)
        : notSet,
    },
    {
      label: t("profile.prefFocus"),
      value: answers.focus ? labelFor(t, "focus", FOCUS_CHOICES[g], answers.focus) : notSet,
    },
    {
      label: t("profile.prefConcern"),
      value: answers.concern
        ? labelFor(t, "concern", CONCERN_CHOICES[g], answers.concern)
        : notSet,
    },
    {
      label: t("profile.prefHair"),
      value:
        answers.hairType && answers.hairLength
          ? [
              labelFor(t, "hairType", HAIR_TYPE_CHOICES, answers.hairType),
              labelFor(t, "hairLength", HAIR_LENGTH_CHOICES[g], answers.hairLength),
            ].join(" · ")
          : notSet,
    },
    {
      label: t("profile.prefSkin"),
      value: answers.skinType
        ? [
            labelFor(t, "skinType", SKIN_TYPE_CHOICES, answers.skinType),
            ...answers.skinConcerns
              .filter((c) => c !== "none")
              .map((c) => labelFor(t, "skinConcern", SKIN_CONCERN_CHOICES, c)),
          ].join(" · ")
        : notSet,
    },
    {
      label: t("profile.prefTime"),
      value: answers.dailyMinutes
        ? labelFor(t, "dailyMinutes", DAILY_MINUTES_CHOICES, answers.dailyMinutes)
        : notSet,
    },
  ];

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm === "photos") {
        await deleteAllPhotos();
        setPhotoUrl(null);
        toast(t("profile.photosDeleted"));
      } else {
        await deleteAccount();
        reset();
        toast(t("profile.accountDeleted"));
        router.push("/");
      }
      setConfirm(null);
    } catch {
      toast(t("common.didntGoThrough"), "error");
    } finally {
      setBusy(false);
    }
  }

  const getPlanTitle = () => {
    if (!isSubscribed) return t("profile.planFree");
    if (subscription?.plan === "trial") return t("profile.planTrial");
    if (subscription?.plan === "monthly") return t("profile.planMonthly");
    if (subscription?.plan === "yearly") return t("profile.planYearly");
    return t("profile.planActive");
  };

  return (
    <main>
      <TopBar back={false} title={t("profile.title")} />

      <Card className="mt-6 flex items-center gap-4 p-5">
        {photoUrl ? (
          <ImageFrame
            src={photoUrl}
            alt=""
            ratio="aspect-square"
            className="size-16 shrink-0 rounded-2xl"
            imgClassName="object-[center_20%]"
          />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line bg-raised text-muted">
            <User className="size-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="type-display text-[1.7rem]">
            {answers.aesthetic
              ? labelFor(t, "aesthetic", AESTHETIC_CHOICES[g], answers.aesthetic)
              : t("profile.yourProfile")}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-champagne">
            {answers.age ? `${t("common.ageYears", { value: formatNumber(answers.age) })} · ` : ""}
            {g === "neutral"
              ? t("profile.neutralRecommendations")
              : t(`profile.genderLabel.${g}`)}
          </p>
        </div>
      </Card>

      {/* Subscription Details Card */}
      <section className="mt-8">
        <SectionHeader
          eyebrow={t("profile.membershipEyebrow")}
          title={t("profile.membershipTitle")}
        />

        <Card className="relative overflow-hidden p-5">
          {isSubscribed && (
            <div className="pointer-events-none absolute -top-12 -end-12 size-36 rounded-full bg-champagne/10 blur-2xl" />
          )}

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl border transition-colors",
                  isSubscribed
                    ? "border-champagne/40 bg-champagne/10 text-champagne shadow-[0_0_15px_rgba(224,188,140,0.15)]"
                    : "border-line bg-raised text-muted",
                )}
              >
                {isSubscribed ? <Crown className="size-5 text-champagne" /> : <Sparkles className="size-5 text-muted" />}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="type-title text-[16px] text-cream font-medium">
                    {getPlanTitle()}
                  </h3>

                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase",
                      isSubscribed
                        ? "bg-champagne/20 text-champagne border border-champagne/40"
                        : "bg-surface text-muted border border-line",
                    )}
                  >
                    {isSubscribed ? t("profile.statusActive") : t("profile.statusFree")}
                  </span>
                </div>

                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  {isSubscribed
                    ? subscription?.expiresAt
                      ? t("profile.renewsOn", { date: shortDate(subscription.expiresAt) })
                      : t("profile.activeUnlimited")
                    : t("profile.freeAccessBody")}
                </p>
              </div>
            </div>

            <div className="mt-1 sm:mt-0 shrink-0">
              <Button
                variant={isSubscribed ? "secondary" : "primary"}
                size="sm"
                onClick={() => setPaywallOpen(true)}
                className="w-full sm:w-auto"
              >
                {isSubscribed ? (
                  <>
                    <CreditCard className="size-4" />
                    {t("profile.managePlan")}
                  </>
                ) : (
                  <>
                    <Zap className="size-4" />
                    {t("profile.upgradeNow")}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12.5px] text-muted">
            <div className="flex items-center gap-2">
              <Check className={cn("size-3.5 shrink-0", isSubscribed ? "text-champagne" : "text-faint")} />
              <span className={cn(isSubscribed ? "text-cream/90" : "text-muted")}>
                {t("profile.featureAiAnalysis")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn("size-3.5 shrink-0", isSubscribed ? "text-champagne" : "text-faint")} />
              <span className={cn(isSubscribed ? "text-cream/90" : "text-muted")}>
                {t("profile.featureCustomPlan")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn("size-3.5 shrink-0", isSubscribed ? "text-champagne" : "text-faint")} />
              <span className={cn(isSubscribed ? "text-cream/90" : "text-muted")}>
                {t("profile.featureStylesBeard")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={cn("size-3.5 shrink-0", isSubscribed ? "text-champagne" : "text-faint")} />
              <span className={cn(isSubscribed ? "text-cream/90" : "text-muted")}>
                {t("profile.featureUnlimitedRescans")}
              </span>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeader
          eyebrow={t("profile.fromQuestionnaire")}
          title={t("profile.preferences")}
        />
        <Card className="divide-y divide-line">
          {prefs.map((p) => (
            <div key={p.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-[14px] text-muted">{p.label}</span>
              <span className="text-end text-[14px] text-cream">{p.value}</span>
            </div>
          ))}
        </Card>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          className="mt-3"
          onClick={() => router.push("/questionnaire")}
        >
          <Pencil className="size-4" aria-hidden />
          {t("profile.editPreferences")}
        </Button>
      </section>

      <section className="mt-8">
        <SectionHeader
          eyebrow={t("profile.control")}
          title={t("profile.privacyAndNotifications")}
        />
        <Card className="divide-y divide-line">
          {/* Language sits with the other things the user controls about the
              app, above privacy, because it changes everything below it. */}
          <LanguageRow />
          <Toggle
            icon={Lock}
            label={t("profile.keepPrivate")}
            body={t("profile.keepPrivateBody")}
            on={privatePhotos}
            onChange={(v) => {
              setPrivatePhotos(v);
              toast(t(v ? "profile.privateOn" : "profile.privateOff"), "info");
            }}
          />
          <Toggle
            icon={Bell}
            label={t("profile.reminders")}
            body={t("profile.remindersBody")}
            on={notifications}
            onChange={(v) => {
              setNotifications(v);
              toast(t(v ? "profile.remindersOn" : "profile.remindersOff"), "info");
            }}
          />
        </Card>
      </section>

      <section className="mt-8 mb-2">
        <SectionHeader eyebrow={t("profile.yourData")} title={t("profile.manage")} />
        <Card className="divide-y divide-line">
          <Row
            icon={ShieldCheck}
            label={t("profile.privacyPolicy")}
            onClick={() => toast(t("profile.policyNotInPrototype"), "info")}
          />
          <Row
            icon={FileText}
            label={t("profile.termsOfUse")}
            onClick={() => toast(t("profile.termsNotInPrototype"), "info")}
          />
          <Row
            icon={ImageOff}
            label={t("profile.deletePhotos")}
            onClick={() => setConfirm("photos")}
          />
          <Row
            icon={Trash2}
            label={t("profile.deleteAccount")}
            tone="danger"
            onClick={() => setConfirm("account")}
          />
        </Card>

        <p className="mt-5 text-[11.5px] leading-relaxed text-faint">{t("profile.disclaimer")}</p>
      </section>

      <Sheet
        open={confirm !== null}
        onClose={() => !busy && setConfirm(null)}
        title={t(
          confirm === "account"
            ? "profile.confirmAccountTitle"
            : "profile.confirmPhotosTitle",
        )}
        description={t(
          confirm === "account"
            ? "profile.confirmAccountDescription"
            : "profile.confirmPhotosDescription",
        )}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)} disabled={busy}>
              {t("profile.keepIt")}
            </Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={runConfirm}>
              {t("common.delete")}
            </Button>
          </div>
        }
      >
        {confirm === "account" && isSubscribed && (
          <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3">
            <Crown className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            <p className="text-[13px] font-medium leading-snug text-danger-soft">
              {t("profile.subscriptionLossWarning")}
            </p>
          </div>
        )}
        <p className="pb-2 text-[13.5px] leading-relaxed text-muted">
          {t(
            confirm === "account"
              ? "profile.confirmAccountBody"
              : "profile.confirmPhotosBody",
          )}
        </p>
      </Sheet>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </main>
  );
}

function Row({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 px-5 py-4 text-start transition-colors hover:bg-cream/[.03]"
    >
      <Icon
        className={cn("size-[17px] shrink-0", tone === "danger" ? "text-danger" : "text-muted")}
        aria-hidden
      />
      <span className={cn("flex-1 text-[14.5px]", tone === "danger" ? "text-danger" : "text-cream")}>
        {label}
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint rtl:-scale-x-100" aria-hidden />
    </button>
  );
}

function Toggle({
  icon: Icon,
  label,
  body,
  on,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  body: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3.5 px-5 py-4">
      <Icon className="mt-0.5 size-[17px] shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px]">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{body}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn(
          "mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors duration-200",
          on ? "bg-champagne" : "bg-cream/12",
        )}
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-ink transition-transform duration-200",
            // The knob travels toward the end of the row, whichever side that is.
            on ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
