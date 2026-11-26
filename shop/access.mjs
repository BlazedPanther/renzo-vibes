import { createRemoteJWKSet, jwtVerify } from "jose";

export function readAdminAccess(env) {
  const team = env.MERCH_ACCESS_TEAM;
  const audience = env.MERCH_ACCESS_AUDIENCE;
  const email = env.MERCH_ACCESS_EMAIL;
  if (team === undefined && audience === undefined && email === undefined) return null;
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(team ?? "") ||
    !/^[a-f0-9]{64}$/.test(audience ?? "") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "")
  ) {
    throw new Error("Invalid Cloudflare Access settings for the merch admin");
  }
  return { team, audience, email: email.toLowerCase() };
}

export function createAdminAccessVerifier({ team, audience, email }) {
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
      return typeof payload.email === "string" && payload.email.toLowerCase() === email;
    } catch {
      return false;
    }
  };
}
