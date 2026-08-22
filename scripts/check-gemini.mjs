// Lists the models your GEMINI_API_KEY can actually reach, and checks the one
// the app is configured to use.  Run: node --env-file=.env.local scripts/check-gemini.mjs
const key = process.env.GEMINI_API_KEY;
const want = process.env.GEMINI_MODEL || "gemini-3.7-flash";

if (!key) {
  console.error("GEMINI_API_KEY is not set. Add it to .env.local.");
  process.exit(1);
}

const res = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
  { headers: { "x-goog-api-key": key } },
);

if (!res.ok) {
  console.error(`Listing models failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const { models = [] } = await res.json();
const usable = models
  .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
  .map((m) => m.name.replace("models/", ""))
  .sort();

console.log(`\nModels available to this key (${usable.length}):\n`);
for (const name of usable) console.log(`  ${name}`);

const match = usable.includes(want);
console.log(
  match
    ? `\n✓ GEMINI_MODEL="${want}" is available.\n`
    : `\n✗ GEMINI_MODEL="${want}" is NOT in the list above.\n  Pick one from the list and set GEMINI_MODEL in .env.local.\n`,
);
process.exit(match ? 0 : 1);
