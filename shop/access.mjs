import { createRemoteJWKSet, jwtVerify } from "jose";

export function readAdminAccess(env) {
  const team = env.MERCH_ACCESS_TEAM;
  const audience = env.MERCH_ACCESS_AUDIENCE;
  const configured = env.MERCH_ACCESS_EMAIL;
  if (team === undefined && audience === undefined && configured === undefined) return null;
  // One or more allowed addresses, separated by commas.
  const emails = (configured ?? "").split(",").map((entry) => entry.trim().toLowerCase());
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(team ?? "") ||
    !/^[a-f0-9]{64}$/.test(audience ?? "") ||
    emails.length > 5 ||
    !emails.every((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
  ) {
    throw new Error("Invalid Cloudflare Access settings for the merch admin");
  }
  return { team, audience, emails };
}

export function createAdminAccessVerifier({ team, audience, emails }) {
  const issuer = `https://${team}.cloudflareaccess.com`;
  const keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer), {
    timeoutDuration: 3_000,
  });
  return async (token) => {
    if (typeof token !== "string" || token.length > 8192 || token.includes(",")) return false;
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer,
        audience,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "email"],
      });
      return typeof payload.email === "string" && emails.includes(payload.email.toLowerCase());
    } catch {
      return false;
    }
  };
}
