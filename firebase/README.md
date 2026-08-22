# Firebase setup for the web app

The web app talks to the **`glowzen-ee2d3`** project but keeps to its own namespace:

| What            | Where                                       |
| --------------- | ------------------------------------------- |
| User document   | `glowzen_web_users/{uid}`                   |
| Analyses        | `glowzen_web_users/{uid}/analyses/{id}`     |
| Plan + progress | `glowzen_web_users/{uid}/state/{plan\|progress}` |
| Photos          | Cloudflare R2, not Firebase Storage — see [docs/photo-storage.md](../docs/photo-storage.md) |

It never reads or writes the mobile app's `glowface_*` collections.

Until the two steps below are done, every call fails softly: the app logs a
warning, keeps the session on-device, and stays fully clickable.

## 1. Enable anonymous sign-in

Console → **Authentication → Sign-in method → Anonymous → Enable**.

Photo uploads need this too: the API routes verify a Firebase ID token before
writing anything to R2.

Without it the SDK returns `auth/configuration-not-found` and the app falls back
to a per-browser local id, which the rules below will reject.

## 2. Add the web rules

> **Merge these into your existing rules — don't replace the file.**
> Deploying a rules file overwrites everything in it, including the
> `glowface_*` rules your mobile app depends on.

### Firestore

The rules live in [`firestore.rules`](./firestore.rules). Open
**Console → Firestore Database → Rules**, paste the two `match` blocks from that
file into your existing ruleset, and publish.

Direct link: https://console.firebase.google.com/project/glowzen-ee2d3/firestore/rules

Until that's published you'll see one line in the browser console —

```
[glowzen] Firestore rules haven't been published for glowzen_web_users yet, …
```

— and the app keeps working from local state. Nothing breaks; history and
progress just don't follow you to another device.

## What is real and what is not

Scoring, opportunities, matched hairstyles and makeup come from Gemini — see
[docs/ai-analysis.md](../docs/ai-analysis.md). Photos are real, in R2.

Still not generated: the on-face preview images for hairstyles and makeup.
`GEMINI_IMAGE_MODEL` is configured but not wired, so those surfaces show an
honest "no preview rendered yet" panel rather than a stand-in photo.
