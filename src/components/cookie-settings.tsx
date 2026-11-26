import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cookieSettingsEvent } from "@/lib/analytics";
import "./cookie-settings.css";

const cookieName = "__Host-rv_analytics";
const endpoint = "/api/site-analytics";
type Choice = "yes" | "no";

function post(type: "view" | "withdraw") {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
    keepalive: true,
    referrerPolicy: "no-referrer",
  }).catch(() => undefined);
}

export function CookieSettings({ pathname }: { pathname: string }) {
  const [choice, setChoice] = useState<Choice>();
  const [visible, setVisible] = useState(false);
  const lastView = useRef<string | undefined>(undefined);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const heading = useRef<HTMLHeadingElement>(null);
  const manuallyOpened = useRef(false);
  const settingsTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const entry = document.cookie
      .split("; ")
      .find((part) => part.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    if (entry === "yes" || entry === "no") setChoice(entry);
    else setVisible(true);
    function showSettings() {
      manuallyOpened.current = true;
      settingsTrigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setVisible(true);
      heading.current?.focus();
    }
    window.addEventListener(cookieSettingsEvent, showSettings);
    return () => window.removeEventListener(cookieSettingsEvent, showSettings);
  }, []);

  useEffect(() => {
    if (visible && manuallyOpened.current) heading.current?.focus();
  }, [visible]);

  useEffect(() => {
    if (choice !== "yes" || lastView.current === pathname) return;
    lastView.current = pathname;
    pending.current = pending.current.then(() => post("view"));
  }, [choice, pathname]);

  function choose(value: Choice) {
    document.cookie = `${cookieName}=${value}; Path=/; Max-Age=15552000; SameSite=Lax; Secure`;
    if (value === "no" && choice === "yes") {
      lastView.current = undefined;
      pending.current = pending.current.then(() => post("withdraw"));
    }
    if (manuallyOpened.current) {
      settingsTrigger.current?.focus();
      manuallyOpened.current = false;
    }
    setChoice(value);
    setVisible(false);
  }

  return visible ? (
    <section className="cookie-settings" aria-labelledby="cookie-settings-title">
      <h2 id="cookie-settings-title" ref={heading} tabIndex={-1}>
        Cookie settings
      </h2>
      <p>
        With your permission, a first-party cookie helps us count website visits and recognise
        returning browsers.{" "}
        <Link to="/privacy" hash="cookies">
          Privacy policy
        </Link>
      </p>
      <div className="cookie-settings-actions">
        <button type="button" onClick={() => choose("no")}>
          Reject analytics
        </button>
        <button type="button" onClick={() => choose("yes")}>
          Allow analytics
        </button>
      </div>
    </section>
  ) : null;
}
