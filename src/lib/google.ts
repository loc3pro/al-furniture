import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  }
  return jwks;
}

export type GoogleIdPayload = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string
): Promise<GoogleIdPayload | null> {
  if (!clientId) return null;
  try {
    const { payload } = await jwtVerify(credential, getJwks(), {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });
    return {
      sub: String(payload.sub ?? ""),
      email: typeof payload.email === "string" ? payload.email : undefined,
      email_verified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  } catch {
    return null;
  }
}
