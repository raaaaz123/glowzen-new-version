import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AuthError, requireUser } from "@/lib/server/auth";
import { isR2Configured, ownsKey, R2_BUCKET, r2 } from "@/lib/server/r2";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/** Long enough to browse the app, short enough that a leaked URL dies quickly. */
const TTL_SECONDS = 600;

/**
 * Hands back a short-lived read URL for one object the caller owns. Reads go
 * straight to R2 from here, so photo traffic doesn't run through this server.
 */
export async function POST(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUser(request));
  } catch (error) {
    return Response.json(
      { error: error instanceof AuthError ? error.message : "Unauthorized." },
      { status: 401 },
    );
  }

  if (!rateLimit(`view:${uid}`, 60, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!isR2Configured) return Response.json({ error: "Not configured." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key : "";

  // The prefix check is the authorization: you can only sign your own objects.
  if (!ownsKey(uid, key)) return Response.json({ error: "Not found." }, { status: 404 });

  const url = await getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: TTL_SECONDS },
  );

  return Response.json(
    { url, expiresAt: Date.now() + TTL_SECONDS * 1000 },
    { headers: { "cache-control": "no-store" } },
  );
}
