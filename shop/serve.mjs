import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readShopConfig } from "./config.mjs";
import { openOrders } from "./orders.mjs";
import { createSumUpProvider } from "./sumup.mjs";
import { createMerchHandler } from "./http.mjs";
import { createMailer } from "./mail.mjs";

const env = process.env;
const caddy = spawn(
  "caddy",
  ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"],
  { stdio: "inherit" },
);
caddy.on("error", () => process.exit(1));
caddy.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => caddy.kill(signal));

let handler = (_req, res) => {
  res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ error: "Merch checkout is unavailable." }));
};
createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, (req, res) =>
  handler(req, res),
).listen(8788, "127.0.0.1");

async function bootstrap() {
  const settings = readShopConfig(env);
  if (!settings) return;
  const { config, filename } = settings;
  const provider = await createSumUpProvider({
    key: env.MERCH_SUMUP_KEY,
    merchant: env.MERCH_SUMUP_MERCHANT,
    mode: config.mode,
  });
  const orders = openOrders({
    filename,
    provider,
    config,
    sendConfirmations: !!settings.mail,
    sendMerchantNotifications: !!settings.mail?.merchantRecipient,
  });
  handler = createMerchHandler(orders, settings);
  console.info(`Merch backend ready in ${config.mode} mode. Orders open: ${settings.allowNew}`);

  function repeat(task, delay) {
    async function run() {
      try {
        await task();
      } catch {
        console.warn("Merch background task deferred.");
      } finally {
        setTimeout(run, delay).unref();
      }
    }
    void run();
  }
  repeat(() => orders.reconcile(), 15_000);
  if (settings.mail) {
    const send = createMailer({
      ...settings.mail,
      adminUrl: new URL("/merch-admin", settings.origin).href,
    });
    repeat(() => orders.sendMail(send), 2_000);
  }
  if (config.mode === "live") {
    repeat(() => orders.pruneAddresses(settings.addressRetentionDays), 60 * 60_000);
  }
}

async function start() {
  try {
    await bootstrap();
  } catch {
    console.warn("Merch unavailable: check configuration, persistent mount and SumUp permissions.");
    setTimeout(start, 60_000).unref();
  }
}
void start();
