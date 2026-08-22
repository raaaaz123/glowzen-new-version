import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { AuthError, requireUser } from "@/lib/server/auth";
import { isR2Configured, R2_BUCKET, r2, userPrefix } from "@/lib/server/r2";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

/** Only real raster photos. No SVG — it can carry script. */
const ALLOWED: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": {
    ext: "png",
    magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/webp": {
    ext: "webp",
    magic: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
};

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Uploads go through this route rather than a presigned PUT: the browser never
 * receives an R2 credential or a writable URL, and every byte is checked here
 * before it reaches the bucket.
 */
export async function POST(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUser(request));
  } catch (error) {
    return fail(error instanceof AuthError ? error.message : "Unauthorized.", 401);
  }

  if (!rateLimit(`upload:${uid}`, 12, 60_000)) return fail("Too many uploads. Wait a minute.", 429);
  if (!isR2Configured) return fail("Photo storage isn't configured.", 503);

  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const spec = ALLOWED[contentType];
  if (!spec) return fail("Use a JPEG, PNG or WebP photo.", 415);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return fail("That photo is over 12MB.", 413);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) return fail("The photo was empty.", 400);
  if (bytes.byteLength > MAX_BYTES) return fail("That photo is over 12MB.", 413);
  // A correct content-type header proves nothing; the file's own bytes do.
  if (!spec.magic(bytes)) return fail("That file isn't the image type it claims to be.", 415);

  // Server-generated key: the client never influences where its bytes land.
  const key = `${userPrefix(uid)}${crypto.randomUUID()}.${spec.ext}`;

  await r2().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: "private, max-age=0, no-store",
    }),
  );

  return Response.json({ key }, { status: 201 });
}

/** Removes every photo belonging to the caller. */
export async function DELETE(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUser(request));
  } catch (error) {
    return fail(error instanceof AuthError ? error.message : "Unauthorized.", 401);
  }

  if (!rateLimit(`delete:${uid}`, 6, 60_000)) return fail("Too many requests.", 429);
  if (!isR2Configured) return Response.json({ deleted: 0 });

  const client = r2();
  let deleted = 0;
  let token: string | undefined;

  do {
    const listing = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: userPrefix(uid),
        ContinuationToken: token,
      }),
    );
    const keys = (listing.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key);
    if (keys.length) {
      await client.send(
        new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys } }),
      );
      deleted += keys.length;
    }
    token = listing.IsTruncated ? listing.NextContinuationToken : undefined;
  } while (token);

  return Response.json({ deleted });
}
