import { createFileRoute } from "@tanstack/react-router";
import { artistHead } from "@/lib/artist";
import { siteConfig, isTodo } from "@/config/site.config";
import { NotFoundComponent } from "@/components/not-found";

export const Route = createFileRoute("/impressum")({
  head: () => artistHead("Impressum | Renzo Vibes", "Anbieterkennzeichnung von Renzo Vibes."),
  component: Page,
});

const F = ({ v }: { v: string }) =>
  isTodo(v) ? <span className="legal-todo">[{v}]</span> : <>{v}</>;

function Page() {
  const i = siteConfig.legal.impressum;
  if (!i.enabled) return <NotFoundComponent />;
  return (
    <main className="legal-page">
      <section className="artist-section standalone">
        <div className="section-inner">
          <p className="eyebrow">
            <span />
            LEGAL
          </p>
          <h2>IMPRESSUM</h2>
          <p className="legal-draft">
            ENTWURF – vor Veröffentlichung vom Betreiber zu prüfen und zu vervollständigen.
          </p>
          <h3>Verantwortlich</h3>
          <p>
            <F v={i.responsiblePerson} />
            <br />
            <F v={i.address} />
          </p>
          <h3>Kontakt</h3>
          <p>
            E-Mail: <F v={i.email} />
            <br />
            Telefon: <F v={i.phone} />
          </p>
          <h3>Register / Steuernummer</h3>
          <p>
            <F v={i.registerOrVat} />
          </p>
        </div>
      </section>
    </main>
  );
}
