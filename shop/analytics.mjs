import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const dayLength = 86_400_000;
const retention = 30;
const zurichDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" });
const visitorCookie = "__Host-rv_visitor";
const cookieSettings = "Path=/; Secure; HttpOnly; SameSite=Lax";
const previousDay = (day, days) =>
  new Date(Date.parse(day + "T00:00:00Z") - days * dayLength).toISOString().slice(0, 10);

export function siteAnalytics(db, now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_visit_days (
      day TEXT NOT NULL,
      visitor TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (day, visitor)
    ) WITHOUT ROWID;
  `);
  const upsert = db.prepare(`
    INSERT INTO site_visit_days (day, visitor) VALUES (?, ?)
    ON CONFLICT (day, visitor) DO UPDATE SET views = views + 1
  `);
  const count = db.prepare(`
    SELECT COALESCE(SUM(views), 0) AS views, COUNT(DISTINCT visitor) AS visitors
    FROM site_visit_days WHERE day BETWEEN ? AND ?
  `);
  const daily = db.prepare(`
    SELECT day, SUM(views) AS views, COUNT(*) AS visitors
    FROM site_visit_days WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day DESC
  `);
  const prune = db.prepare("DELETE FROM site_visit_days WHERE day < ?");
  return {
    view(id) {
      const visitor = createHash("sha256").update(id).digest("hex");
      upsert.run(zurichDay.format(now()), visitor);
    },
    clearOld() {
      prune.run(previousDay(zurichDay.format(now()), retention - 1));
    },
    summary() {
      const today = zurichDay.format(now());
      const earliest = previousDay(today, retention - 1);
      return {
        today: count.get(today, today),
        month: count.get(earliest, today),
        days: daily.all(previousDay(today, 6), today),
      };
    },
  };
}

export function readAnalyticsCookies(header, key) {
  const cookies = new Map((header ?? "").split(";").map((entry) => entry.trim().split("=", 2)));
  const sign = (id) => createHmac("sha256", key).update(`site-analytics:v1:${id}`).digest();
  const raw = cookies.get(visitorCookie);
  const match = raw?.match(/^([a-f0-9]{32})\.([a-f0-9]{64})$/);
  const id =
    match && timingSafeEqual(sign(match[1]), Buffer.from(match[2], "hex")) ? match[1] : null;
  return {
    allowed: cookies.get("__Host-rv_analytics") === "yes",
    id,
    clear: `${visitorCookie}=; Max-Age=0; ${cookieSettings}`,
    create() {
      const visitor = randomBytes(16).toString("hex");
      return {
        visitor,
        cookie: `${visitorCookie}=${visitor}.${sign(visitor).toString("hex")}; Max-Age=${retention * 86400}; ${cookieSettings}`,
      };
    },
  };
}
