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
import { getPhotoUrl } from "@/lib/storage/photos";
import type { Gender, QuestionnaireAnswers } from "@/lib/types";

const STORAGE_KEY = "glow.session.v1";

const EMPTY_ANSWERS: QuestionnaireAnswers = {
  gender: null,
  ageRange: null,
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

interface Persisted {
  answers: QuestionnaireAnswers;
  hasAnalysis: boolean;
  savedStyleId: string | null;
  /** R2 object key. Safe to keep locally — it's an id, not the photo. */
  photoKey: string | null;
  taskState: Record<string, boolean>;
  /** YYYY-MM-DD → habit ids ticked that day. Drives the streak. */
  habitLog: Record<string, string[]>;
}

interface GlowValue extends Persisted {
  /** Selfie the user picked this session. Not persisted — it's their photo. */
  photoUrl: string | null;
  hydrated: boolean;
  gender: Gender | null;
  setAnswer: <K extends keyof QuestionnaireAnswers>(
    key: K,
    value: QuestionnaireAnswers[K],
  ) => void;
  setPhotoUrl: (url: string | null) => void;
  setPhotoKey: (key: string | null) => void;
  completeAnalysis: () => void;
  setSavedStyleId: (id: string | null) => void;
  toggleTask: (id: string, done: boolean) => void;
  toggleHabit: (id: string, done: boolean) => void;
  reset: () => void;
}

const GlowContext = createContext<GlowValue | null>(null);

export function GlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>({
    answers: EMPTY_ANSWERS,
    hasAnalysis: false,
    savedStyleId: null,
    photoKey: null,
    taskState: {},
    habitLog: {},
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
          answers: { ...EMPTY_ANSWERS, ...parsed.answers },
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
      if (!hasRemoteAnswers && !remote.savedStyleId && !remote.photoKey) return;

      setState((prev) => ({
        ...prev,
        answers: { ...prev.answers, ...remote.answers },
        savedStyleId: remote.savedStyleId ?? prev.savedStyleId,
        photoKey: remote.photoKey ?? prev.photoKey,
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
    });
    setPhotoUrl(null);
  }, []);

  const value = useMemo<GlowValue>(
    () => ({
      ...state,
      photoUrl,
      hydrated,
      gender: state.answers.gender,
      setAnswer,
      setPhotoUrl,
      setPhotoKey,
      completeAnalysis,
      setSavedStyleId,
      toggleTask,
      toggleHabit,
      reset,
    }),
    [
      state,
      photoUrl,
      hydrated,
      setAnswer,
      setPhotoKey,
      completeAnalysis,
      setSavedStyleId,
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
