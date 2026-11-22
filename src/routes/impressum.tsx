import { createFileRoute } from "@tanstack/react-router";
import { artistHead } from "@/lib/artist";
import { siteConfig, isTodo } from "@/config/site.config";
import { NotFoundComponent } from "@/components/not-found";

export const Route = createFileRoute("/impressum")({
  head: () => artistHead("Legal notice | Renzo Vibes", "Legal notice of Renzo Vibes."),
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
          <h2>LEGAL NOTICE</h2>
          <p className="legal-draft">
            DRAFT – to be reviewed and completed by the operator before publication.
          </p>
          <h3>Responsible person</h3>
          <p>
            <F v={i.responsiblePerson} />
            <br />
            <F v={i.address} />
          </p>
          <h3>Contact</h3>
          <p>
            Email: <F v={i.email} />
            <br />
            Phone: <F v={i.phone} />
          </p>
          <h3>Register / VAT number</h3>
          <p>
            <F v={i.registerOrVat} />
          </p>
        </div>
      </section>
    </main>
  );
}
