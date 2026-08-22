"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ErrorState } from "@/components/ui/States";
import { ANALYSIS_STAGES, runAnalysis } from "@/services/analysisService";
import { useGlow } from "@/lib/state/GlowContext";
import { cn } from "@/lib/utils";

const STAGE_MS = 1500;

export default function AnalyzingPage() {
  const router = useRouter();
  const { gender, photoUrl, photoKey, answers, completeAnalysis, hydrated } = useGlow();
  const [stage, setStage] = useState(0);
  const [percent, setPercent] = useState(4);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedFor = useRef<number | null>(null);
  const alive = useRef(true);

  // Latest inputs without making them effect dependencies: `answers` gets a new
  // object identity when the Firestore merge lands, and depending on it fired a
  // second (paid) analysis mid-flight.
  const latest = useRef({ gender, photoUrl, photoKey, answers });
  latest.current = { gender, photoUrl, photoKey, answers };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The animation is pure UI, so it's free to restart.
  useEffect(() => {
    if (!hydrated) return;
    setFailure(null);
    setStage(0);
    setPercent(4);

    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, ANALYSIS_STAGES.length - 1));
    }, STAGE_MS);

    const tick = setInterval(() => {
      setPercent((p) => (p >= 97 ? p : p + Math.max(0.6, (97 - p) / 22)));
    }, 60);

    return () => {
      clearInterval(stageTimer);
      clearInterval(tick);
    };
  }, [hydrated, attempt]);

  // The call itself runs exactly once per attempt and is never cancelled
  // mid-flight — it costs money and the result is worth keeping.
  useEffect(() => {
    if (!hydrated) return;
    if (startedFor.current === attempt) return;
    startedFor.current = attempt;

    void (async () => {
      try {
        const { gender: g, photoUrl: url, photoKey: key, answers: a } = latest.current;
        // Run the real call and the stage animation together, so a fast model
        // still gets the full reveal and a slow one doesn't stall on 97%.
        await Promise.all([
          runAnalysis(g, url, key, a),
          new Promise((r) => setTimeout(r, STAGE_MS * ANALYSIS_STAGES.length)),
        ]);
        if (!alive.current) return;
        setPercent(100);
        setStage(ANALYSIS_STAGES.length);
        completeAnalysis();
        setTimeout(() => router.replace("/results"), 700);
      } catch (error) {
        if (!alive.current) return;
        setFailure(
          error instanceof Error
            ? error.message
            : "The analysis didn't finish. Your photo is still saved.",
        );
      }
    })();
  }, [hydrated, attempt, completeAnalysis, router]);

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* ambient light, matching the ring */}
      <div
        className="animate-halo pointer-events-none absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-[62%] rounded-full bg-champagne/10 blur-[110px]"
        aria-hidden
      />

      <div className="relative">
        <h1 className="type-display mb-12 text-[clamp(1.85rem,7vw,2.4rem)]">
          Analyzing your
          <br />
          glow-up potential…
        </h1>

        {failure ? (
          <div className="mx-auto max-w-sm">
            <ErrorState message={failure} onRetry={() => setAttempt((a) => a + 1)} />
            <button
              onClick={() => router.push("/upload")}
              className="mt-4 w-full text-[13px] text-muted underline underline-offset-4 transition-colors hover:text-cream"
            >
              Use a different photo
            </button>
          </div>
        ) : (
          <>
            <ProgressRing value={percent} size={228} stroke={9} className="mx-auto">
              <div>
                <p className="type-display text-[3.4rem] leading-none">
                  {Math.round(percent)}
                  <span className="align-super font-mono text-[13px] text-faint">%</span>
                </p>
              </div>
            </ProgressRing>

            <ul className="mt-12 space-y-3 text-left">
              {ANALYSIS_STAGES.map((label, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-3 text-[14px] transition-all duration-500",
                      done && "text-muted",
                      active && "text-cream",
                      !done && !active && "text-faint/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-400",
                        done && "border-champagne/40 bg-champagne/15 text-champagne",
                        active && "border-champagne bg-champagne/10",
                        !done && !active && "border-line",
                      )}
                    >
                      {done ? (
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      ) : active ? (
                        <span className="size-1.5 animate-pulse rounded-full bg-champagne" />
                      ) : null}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <p className="absolute inset-x-0 bottom-8 px-8 text-[11px] leading-relaxed text-faint">
        Results are AI-generated suggestions, not measurements.
      </p>
    </main>
  );
}
