import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { artistHead } from "@/lib/artist";
import { merchLegalSections, type MerchLegal } from "@/lib/merch-legal";
import "@/components/merch-sandbox.css";

export const Route = createFileRoute("/merch-terms")({
  head: () =>
    artistHead(
      "Shopinformationen | Renzo Vibes",
      "Rechtliche Informationen zum Renzo Vibes Merch-Shop.",
    ),
  component: MerchTerms,
});

function MerchTerms() {
  const [legal, setLegal] = useState<MerchLegal>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/merch/catalog", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Shop information unavailable");
        const result = (await response.json()) as { legal: MerchLegal };
        setLegal(result.legal);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!legal || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [legal]);

  return (
    <main className="artist-section merch-shop">
      <div className="section-inner merch-legal">
        <h1>Shopinformationen</h1>
        <Link to="/merch">Zurück zu Merch</Link>
        {!legal ? (
          <p role="status">
            {failed
              ? "Die Shopinformationen sind derzeit nicht veröffentlicht."
              : "Shopinformationen werden geladen."}
          </p>
        ) : (
          Object.entries(merchLegalSections).map(([key, title]) => (
            <section key={key} id={key}>
              <h2>{title}</h2>
              <p>{legal[key as keyof MerchLegal]}</p>
            </section>
          ))
        )}
        <Link to="/privacy">Datenschutz der Künstlerseite</Link>
      </div>
    </main>
  );
}
