"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyError } from "@/lib/emptyError";

/** Small fetch-state helper so every screen gets loading / error / retry for free. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState<EmptyError | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The caller owns the dependency list; `fn` is redefined on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEmpty(null);
    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Nothing-here-yet gets its own channel so screens can invite instead of alarm.
        if (e instanceof EmptyError) setEmpty(e);
        else setError(e instanceof Error ? e.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [run, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  return { data, loading, error, empty, reload };
}
