"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dateKey } from "@/lib/streak";
import { initAnalytics } from "@/lib/firebase/config";
import { getUserDoc } from "@/services/userService";
import { normalizeAnswers } from "@/lib/data/questions";
import { getPhotoUrl } from "@/lib/storage/photos";
import type { Gender, QuestionnaireAnswers } from "@/lib/types";

const STORAGE_KEY = "glow.session.v1";

const EMPTY_ANSWERS: QuestionnaireAnswers = {
  gender: null,
  age: null,
  focus: null,
  aesthetic: null,
  concern: null,
  hairType: null,
  hairLength: null,
  skinType: null,
  skinConcerns: [],
  commitment: null,
  dailyMinutes: null,
  priority: null,
};

export interface SubscriptionState {
  active: boolean;
  plan: "trial" | "monthly" | "yearly" | null;
  expiresAt: string | null;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
}

interface Persisted {
  answers: QuestionnaireAnswers;
  hasAnalysis: boolean;
  savedStyleId: string | null;
  /** R2 object key. Safe to keep locally — it's an id, not the photo. */
  photoKey: string | null;
  taskState: Record<string, boolean>;
  /** YYYY-MM-DD → habit ids ticked that day. Drives the streak. */
  habitLog: Record<string, string[]>;
  subscription: SubscriptionState | null;
}

interface GlowValue extends Persisted {
  /** Selfie the user picked this session. Not persisted — it's their photo. */
  photoUrl: string | null;
  hydrated: boolean;
  gender: Gender | null;
  /** True when the user has an active paid subscription. */
  isSubscribed: boolean;
  setAnswer: <K extends keyof QuestionnaireAnswers>(
    key: K,
    value: QuestionnaireAnswers[K],
  ) => void;
  setPhotoUrl: (url: string | null) => void;
  setPhotoKey: (key: string | null) => void;
  completeAnalysis: () => void;
  setSavedStyleId: (id: string | null) => void;
  setSubscription: (sub: SubscriptionState | null) => void;
  toggleTask: (id: string, done: boolean) => void;
  toggleHabit: (id: string, done: boolean) => void;
  reset: () => void;
}

const GlowContext = createContext<GlowValue | null>(null);

/**
 * Whether the stored expiry has passed.
 *
 * An expiry we cannot read is treated as "not expired". A subscription
 * written before we normalised the field, or one that came back from
 * Firestore as a Timestamp rather than a string, must not lock a paying
 * customer out of what they bought — the webhook will correct the record.
 */
function hasExpired(sub: SubscriptionState): boolean {
  if (!sub.expiresAt) return false;
  const end = new Date(sub.expiresAt).getTime();
  return Number.isNaN(end) ? false : end <= Date.now();
}

export function GlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>({
    answers: EMPTY_ANSWERS,
    hasAnalysis: false,
    savedStyleId: null,
    photoKey: null,
    taskState: {},
    habitLog: {},
    subscription: null,
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        setState((prev) => ({
          ...prev,
          ...parsed,
          answers: { ...EMPTY_ANSWERS, ...normalizeAnswers(parsed.answers) },
          habitLog: parsed.habitLog ?? {},
        }));
      }
    } catch {
      // A corrupt or unavailable store just means a fresh session.
    }
    setHydrated(true);
  }, []);

  // Anything already stored in Firestore wins over the local cache.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    void initAnalytics();

    void getUserDoc().then((remote) => {
      if (cancelled) return;
      const hasRemoteAnswers = Object.values(remote.answers ?? {}).some(Boolean);
      if (!hasRemoteAnswers && !remote.savedStyleId && !remote.photoKey && !remote.subscription) return;

      setState((prev) => ({
        ...prev,
        answers: { ...prev.answers, ...remote.answers, age: remote.answers.age ?? prev.answers.age },
        savedStyleId: remote.savedStyleId ?? prev.savedStyleId,
        photoKey: remote.photoKey ?? prev.photoKey,
        subscription: remote.subscription ?? prev.subscription,
      }));
      // Stored photos are private; the read URL is signed fresh and expires.
      if (remote.photoKey) {
        void getPhotoUrl(remote.photoKey).then((url) => {
          if (!cancelled && url) setPhotoUrl((prev) => prev ?? url);
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode / quota. The session still works, it just won't survive a reload.
    }
  }, [state, hydrated]);

  const setAnswer = useCallback<GlowValue["setAnswer"]>((key, value) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));
  }, []);

  const completeAnalysis = useCallback(() => {
    setState((prev) => ({ ...prev, hasAnalysis: true }));
  }, []);

  const setPhotoKey = useCallback((key: string | null) => {
    setState((prev) => ({ ...prev, photoKey: key }));
  }, []);

  const setSavedStyleId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, savedStyleId: id }));
  }, []);

  const setSubscription = useCallback((sub: SubscriptionState | null) => {
    setState((prev) => ({ ...prev, subscription: sub }));
  }, []);

  const toggleTask = useCallback((id: string, done: boolean) => {
    setState((prev) => ({ ...prev, taskState: { ...prev.taskState, [id]: done } }));
  }, []);

  const toggleHabit = useCallback((id: string, done: boolean) => {
    const key = dateKey();
    setState((prev) => {
      const today = prev.habitLog[key] ?? [];
      const next = done ? [...new Set([...today, id])] : today.filter((h) => h !== id);
      return { ...prev, habitLog: { ...prev.habitLog, [key]: next } };
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      answers: EMPTY_ANSWERS,
      hasAnalysis: false,
      savedStyleId: null,
      photoKey: null,
      taskState: {},
      habitLog: {},
      subscription: null,
    });
    setPhotoUrl(null);
  }, []);

  const isSubscribed = Boolean(state.subscription?.active && !hasExpired(state.subscription));

  const value = useMemo<GlowValue>(
    () => ({
      ...state,
      photoUrl,
      hydrated,
      gender: state.answers.gender,
      isSubscribed,
      setAnswer,
      setPhotoUrl,
      setPhotoKey,
      completeAnalysis,
      setSavedStyleId,
      setSubscription,
      toggleTask,
      toggleHabit,
      reset,
    }),
    [
      state,
      photoUrl,
      hydrated,
      isSubscribed,
      setAnswer,
      setPhotoKey,
      completeAnalysis,
      setSavedStyleId,
      setSubscription,
      toggleTask,
      toggleHabit,
      reset,
    ],
  );

  return <GlowContext.Provider value={value}>{children}</GlowContext.Provider>;
}

export function useGlow() {
  const ctx = useContext(GlowContext);
  if (!ctx) throw new Error("useGlow must be used inside <GlowProvider>");
  return ctx;
}
