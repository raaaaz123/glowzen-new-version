import "server-only";

import { GoogleGenAI } from "@google/genai";

/**
 * Gemini runs server-side only. The key has no NEXT_PUBLIC_ prefix, so it can
 * never be inlined into the browser bundle.
 */
const apiKey = process.env.GEMINI_API_KEY ?? "";

/** Override in .env.local if your key serves a different model id. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
/** Nano Banana — image editing that keeps the reference face. */
export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

export const isGeminiConfigured = Boolean(apiKey);

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!isGeminiConfigured) throw new Error("Gemini is not configured.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
