"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  FileText,
  ImageOff,
  Lock,
  Pencil,
  ShieldCheck,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { TopBar } from "@/components/app/TopBar";
import { useGlow } from "@/lib/state/GlowContext";
import {
  AESTHETIC_CHOICES,
  AGE_CHOICES,
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
  const { answers, gender, photoUrl, setPhotoUrl, reset } = useGlow();
  const [privatePhotos, setPrivatePhotos] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const g = gender ?? "neutral";

  const prefs = [
    {
      label: "Target aesthetic",
      value: answers.aesthetic ? labelFor(AESTHETIC_CHOICES[g], answers.aesthetic) : "Not set",
    },
    {
      label: "Main goal",
      value: answers.priority ? labelFor(PRIORITY_CHOICES, answers.priority) : "Not set",
    },
    {
      label: "Focus area",
      value: answers.focus ? labelFor(FOCUS_CHOICES[g], answers.focus) : "Not set",
    },
    {
      label: "Biggest concern",
      value: answers.concern ? labelFor(CONCERN_CHOICES[g], answers.concern) : "Not set",
    },
    {
      label: "Hair",
      value:
        answers.hairType && answers.hairLength
          ? `${labelFor(HAIR_TYPE_CHOICES, answers.hairType)} · ${labelFor(HAIR_LENGTH_CHOICES[g], answers.hairLength)}`
          : "Not set",
    },
    {
      label: "Skin",
      value: answers.skinType
        ? [
            labelFor(SKIN_TYPE_CHOICES, answers.skinType),
            ...answers.skinConcerns
              .filter((c) => c !== "none")
              .map((c) => labelFor(SKIN_CONCERN_CHOICES, c)),
          ].join(" · ")
        : "Not set",
    },
    {
      label: "Time a day",
      value: answers.dailyMinutes
        ? labelFor(DAILY_MINUTES_CHOICES, answers.dailyMinutes)
        : "Not set",
    },
  ];

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm === "photos") {
        await deleteAllPhotos();
        setPhotoUrl(null);
        toast("Photos deleted.");
      } else {
        await deleteAccount();
        reset();
        toast("Account deleted.");
        router.push("/");
      }
      setConfirm(null);
    } catch {
      toast("That didn't go through. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <TopBar back={false} title="Profile" />

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
            {answers.aesthetic ? labelFor(AESTHETIC_CHOICES[g], answers.aesthetic) : "Your profile"}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-champagne">
            {answers.ageRange ? `${labelFor(AGE_CHOICES, answers.ageRange)} · ` : ""}
            {g === "neutral" ? "Neutral recommendations" : `${g[0].toUpperCase()}${g.slice(1)}`}
          </p>
        </div>
      </Card>

      <section className="mt-8">
        <SectionHeader eyebrow="From your questionnaire" title="Preferences" />
        <Card className="divide-y divide-line">
          {prefs.map((p) => (
            <div key={p.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-[14px] text-muted">{p.label}</span>
              <span className="text-right text-[14px] text-cream">{p.value}</span>
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
          Edit preferences
        </Button>
      </section>

      <section className="mt-8">
        <SectionHeader eyebrow="Control" title="Privacy & notifications" />
        <Card className="divide-y divide-line">
          <Toggle
            icon={Lock}
            label="Keep my photos private"
            body="Photos are never used for anything but your own analysis."
            on={privatePhotos}
            onChange={(v) => {
              setPrivatePhotos(v);
              toast(v ? "Photos kept private." : "Photo privacy turned off.", "info");
            }}
          />
          <Toggle
            icon={Bell}
            label="Plan reminders"
            body="One nudge a week while your 30-day plan runs."
            on={notifications}
            onChange={(v) => {
              setNotifications(v);
              toast(v ? "Reminders on." : "Reminders off.", "info");
            }}
          />
        </Card>
      </section>

      <section className="mt-8 mb-2">
        <SectionHeader eyebrow="Your data" title="Manage" />
        <Card className="divide-y divide-line">
          <Row icon={ShieldCheck} label="Privacy policy" onClick={() => toast("Policy page isn't in this prototype.", "info")} />
          <Row icon={FileText} label="Terms of use" onClick={() => toast("Terms page isn't in this prototype.", "info")} />
          <Row icon={ImageOff} label="Delete my photos" onClick={() => setConfirm("photos")} />
          <Row icon={Trash2} label="Delete my account" tone="danger" onClick={() => setConfirm("account")} />
        </Card>

        <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
          Recommendations are AI-generated suggestions, not measurements or medical advice.
        </p>
      </section>

      <Sheet
        open={confirm !== null}
        onClose={() => !busy && setConfirm(null)}
        title={confirm === "account" ? "Delete your account?" : "Delete your photos?"}
        description={
          confirm === "account"
            ? "This removes your profile, analyses and plan. It can't be undone."
            : "Your analyses stay, but the photos behind them are removed."
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={runConfirm}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="pb-2 text-[13.5px] leading-relaxed text-muted">
          {confirm === "account"
            ? "You can start again from the welcome screen at any time."
            : "You'll need a new photo before your next analysis."}
        </p>
      </Sheet>
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
      className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-cream/[.03]"
    >
      <Icon
        className={cn("size-[17px] shrink-0", tone === "danger" ? "text-danger" : "text-muted")}
        aria-hidden
      />
      <span className={cn("flex-1 text-[14.5px]", tone === "danger" ? "text-danger" : "text-cream")}>
        {label}
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
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
            on ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
