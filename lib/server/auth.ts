import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies a Firebase ID token against Google's public keys.
 *
 * This runs on the server only. It needs no service-account credentials — the
 * signing keys are public — so there is no private key to leak.
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export interface VerifiedUser {
  uid: string;
}

export class AuthError extends Error {}

/** Returns the caller's uid, or throws. Never trusts a uid sent by the client. */
export async function requireUser(request: Request): Promise<VerifiedUser> {
  if (!PROJECT_ID) throw new AuthError("Auth is not configured on the server.");

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AuthError("Missing bearer token.");

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      clockTolerance: 30,
    }));
  } catch {
    throw new AuthError("Invalid or expired token.");
  }

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  // Firebase uids are opaque; anything outside this set means a forged claim.
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) throw new AuthError("Invalid subject.");

  return { uid };
}
