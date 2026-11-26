import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { readAdminAccess } from "./access.mjs";
import { createMerchHandler } from "./http.mjs";

test("admin requires both a valid Access assertion for Renzo and the existing password", async (t) => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test-key" };
  const issuer = "https://merch-test.cloudflareaccess.com";
  const email = "renzo@example.test";
  const audience = "a".repeat(64);
  const password = "b".repeat(64);
  const adminHash = createHash("sha256").update(password).digest("hex");
  const authorization = "Basic " + Buffer.from("renzo:" + password).toString("base64");

  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (input, options) => {
    if (String(input) === issuer + "/cdn-cgi/access/certs") {
      return Response.json({ keys: [jwk] });
    }
    return realFetch(input, options);
  });
  const server = createServer((req, res) => handler(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const handler = createMerchHandler(
    { admin: () => ({ orders: [], stock: [], mailWaiting: 0, stockMode: "tracked" }) },
    {
      origin,
      adminHash,
      adminAccess: readAdminAccess({
        MERCH_ACCESS_TEAM: "merch-test",
        MERCH_ACCESS_AUDIENCE: audience,
        MERCH_ACCESS_EMAIL: email,
      }),
    },
  );

  const sign = ({ who = email, aud = audience, expiration = "5m" } = {}) =>
    new SignJWT({ email: who })
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer(issuer)
      .setAudience(aud)
      .setExpirationTime(expiration)
      .sign(privateKey);
  const call = (assertion, credentials = authorization) =>
    realFetch(origin + "/merch-admin", {
      headers: {
        ...(assertion && { "Cf-Access-Jwt-Assertion": assertion }),
        ...(credentials && { Authorization: credentials }),
      },
    });

  assert.equal((await call()).status, 403);
  assert.equal((await call("invalid.token.signature")).status, 403);
  assert.equal((await call(await sign({ aud: "other-app" }))).status, 403);
  assert.equal((await call(await sign({ who: "other@example.test" }))).status, 403);
  assert.equal((await call(await sign({ expiration: 1 }))).status, 403);
  const valid = await sign();
  assert.equal((await call(valid, "")).status, 401);
  assert.equal((await call(valid)).status, 200);
});

test("partial admin Access configuration is rejected", () => {
  assert.equal(readAdminAccess({}), null);
  assert.throws(() => readAdminAccess({ MERCH_ACCESS_TEAM: "merch-test" }), /Invalid Cloudflare/);
});
