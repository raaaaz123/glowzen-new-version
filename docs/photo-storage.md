# Photo storage on Cloudflare R2

User photos live in a **private** R2 bucket (`r2-glowze-secure`). Firebase
Storage is no longer used; Firebase still handles auth and Firestore.

## The security model

The rule this is built around: **the browser is never trusted and never holds a
credential.**

**Uploads proxy through our own server.** `POST /api/photos` takes the bytes,
and only then do they reach R2. That's deliberately not a presigned PUT — a
presigned upload URL is a writable capability handed to a client we don't
control. Because the bytes pass through us, the server can enforce things a
presigned URL cannot:

- **Identity.** The Firebase ID token is verified against Google's public keys
  before anything else. The uid comes from the verified token, never from the
  request body, so a caller cannot write into someone else's folder.
- **Size.** Hard 12MB cap, checked on the declared `Content-Length` and again on
  the bytes actually received.
- **Type.** JPEG, PNG and WebP only, confirmed by reading the file's magic bytes
  rather than trusting the `Content-Type` header. **SVG is refused** — it can
  carry script, and a stored XSS in an image bucket is a real risk.
- **Object key.** Server-generated UUID under `photos/{uid}/`. The client's
  filename is discarded, so there's no path traversal and no collision.
- **Rate.** 12 uploads per uid per minute.

**Reads are short-lived signed URLs.** `POST /api/photos/view` checks the token,
confirms the key starts with `photos/{uid}/`, and signs a GET URL valid for
10 minutes. Photo bytes then flow straight from R2 to the browser, so read
traffic doesn't run through the app server. Nothing long-lived is ever stored:
Firestore holds the object *key*, and a fresh URL is signed each session.

**Nothing is public.** The bucket's public access stays off and no `r2.dev`
domain is enabled. Without a valid signature every object returns 401.

**Credentials are server-only.** `R2_*` variables have no `NEXT_PUBLIC_` prefix,
and `lib/server/*` imports `server-only`, so a build fails if that code is ever
pulled into a client component.

## Setup

### 1. Create the bucket

Name `r2-glowze-secure`, location Automatic, **no** jurisdiction, Standard
storage class, and leave **public access off**.

### 2. Create a scoped API token

Cloudflare → **R2 → Manage API tokens → Create API token**:

- Permission: **Object Read & Write**
- Specify bucket: **`r2-glowze-secure`** only — not "all buckets"
- No TTL is fine to start; rotate it if it ever leaks

Copy the values into `.env.local`:

```
R2_ACCOUNT_ID=…        # R2 overview page
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…  # shown once
R2_BUCKET=r2-glowze-secure
```

Never commit these. `.env*` is gitignored.

### 3. No CORS needed for uploads

Uploads go server-side, so the browser never calls R2 directly for writes.
Signed **reads** are plain `<img>` loads, which don't need CORS either. Only add
a CORS policy if you later fetch photo bytes with `fetch()` from the browser.

## Until it's configured

With `R2_*` blank the upload route returns 503 and the app falls back to a local
preview in that tab — the flow stays clickable, nothing is stored. Same if
anonymous sign-in is still disabled in Firebase: no token means no upload.

## Worth adding before real traffic

- Move the rate limiter off in-memory (`lib/server/rateLimit.ts`) to a shared
  store — it currently resets on deploy and doesn't span instances.
- Add a lifecycle rule on the bucket to expire orphaned objects.
- Strip EXIF (including GPS) from uploads before the `PutObject`.
