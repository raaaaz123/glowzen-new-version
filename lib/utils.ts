import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Mock latency, so loading and skeleton states are actually exercised. */
export function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Morning / afternoon / evening, as a dictionary key. The caller translates —
 * the cut-offs are the same everywhere we ship, but the words are not.
 */
export function greetingKey(hour: number) {
  if (hour < 12) return "home.goodMorning";
  if (hour < 18) return "home.goodAfternoon";
  return "home.goodEvening";
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}
