import { createFileRoute } from "@tanstack/react-router";
import { artistHead } from "@/lib/artist";
import { siteConfig, isTodo, spotifyArtistId } from "@/config/site.config";

export const Route = createFileRoute("/datenschutz")({
  head: () =>
    artistHead("Datenschutz | Renzo Vibes", "Datenschutzerklärung der Website von Renzo Vibes."),
  component: Page,
});

const F = ({ v }: { v: string }) =>
  isTodo(v) ? <span className="legal-todo">[{v}]</span> : <>{v}</>;

function Page() {
  const l = siteConfig.legal;
  const hasTodo = [l.operatorName, l.contactEmail, l.operatorCountry].some(isTodo);
  const spotify = !!spotifyArtistId();
  return (
    <main className="legal-page">
      <section className="artist-section standalone">
        <div className="section-inner">
          <p className="eyebrow">
            <span />
            LEGAL
          </p>
          <h2>DATENSCHUTZERKLÄRUNG</h2>
          {hasTodo && (
            <p className="legal-draft">
              ENTWURF – enthält noch unausgefüllte Pflichtangaben und ist vor Veröffentlichung vom
              Betreiber rechtlich zu prüfen.
            </p>
          )}
          <p>Stand: {l.privacyUpdated.split("-").reverse().join(".")}</p>

          <h3>1. Verantwortliche Stelle</h3>
          <p>
            <F v={l.operatorName} />
            <br />
            {l.operatorAddress && (
              <>
                <F v={l.operatorAddress} />
                <br />
              </>
            )}
            E-Mail: <F v={l.contactEmail} />
          </p>

          <h3>2. Worum es auf dieser Website geht</h3>
          <p>
            Diese Website informiert über den Künstler Renzo Vibes (Musik, Videos, Biografie, Links
            zu Social Media). Es gibt kein Kontaktformular, keine Registrierung, keinen Shop, keine
            Zahlungsabwicklung, keinen Newsletter und keine Nutzerkonten. Die Merch-Seite ist eine
            reine Vorschau.
          </p>

          <h3>3. Hosting über Railway und Server-Logfiles</h3>
          <p>
            Die Website wird als statische Seite über den Hosting-Anbieter Railway ausgeliefert
            (Railway Corporation, USA). Die Server stehen in einem Rechenzentrum in den Niederlanden
            (Region Europe West). Beim Aufruf verarbeitet Railway technisch notwendige
            Verbindungsdaten, insbesondere die IP-Adresse, Datum und Uhrzeit, die aufgerufene Seite
            sowie Browser- und Systeminformationen, um die Seite auszuliefern und die Sicherheit zu
            gewährleisten. Diese Zugriffsprotokolle sind für uns im Railway-Konto für eine begrenzte
            Zeit einsehbar; wir werten sie nicht aus und nutzen sie höchstens zur Fehlerbehebung. Da
            Railway ein US-Unternehmen ist, ist ein Zugriff aus den USA bzw. eine Übermittlung
            dorthin möglich; Einzelheiten nennt Railway in seiner eigenen Datenschutzerklärung.
          </p>

          <h3>4. Cookies und lokaler Speicher</h3>
          <p>
            Wir setzen keine Cookies und verwenden keine Analyse-, Marketing- oder
            Tracking-Werkzeuge. Technisch bedingt speichert die Seite beim Navigieren die
            Scroll-Position im <em>sessionStorage</em> des Browsers (keine personenbezogenen Daten,
            wird beim Schliessen des Tabs gelöscht). Schriften werden von dieser Website selbst
            ausgeliefert; es werden keine Schriften von Google-Servern geladen.
          </p>

          <h3>5. Eingebettete Inhalte (Spotify, YouTube)</h3>
          <p>
            Videovorschaubilder liegen auf dieser Website. YouTube-Videos werden erst nach Ihrem
            Klick geladen; bis dahin wird keine Verbindung zu YouTube aufgebaut.
            {spotify &&
              " Der Spotify-Player wird dagegen automatisch geladen, sobald Sie zu dem entsprechenden Bereich der Startseite oder der Musikseite scrollen."}
          </p>
          <ul>
            <li>
              <strong>YouTube</strong> (nach Klick auf ein Video, über die Domain
              youtube-nocookie.com): Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
              Irland, bzw. Google LLC, USA. Dabei werden mindestens Ihre IP-Adresse und Browserdaten
              übermittelt; YouTube kann auch bei der erweiterten Datenschutz-Domain Informationen
              auf Ihrem Gerät speichern oder auslesen. Die Nutzung der Domain youtube-nocookie.com
              schliesst Datenübertragungen nicht aus.
            </li>
            {spotify && (
              <li>
                <strong>Spotify</strong> (automatisch beim Anzeigen des Players): Spotify AB,
                Regeringsgatan 19, 111 53 Stockholm, Schweden. Dabei werden mindestens Ihre
                IP-Adresse und Browserdaten übermittelt; Spotify kann Cookies oder ähnliche
                Technologien einsetzen.
              </li>
            )}
          </ul>
          <p>
            Die Einbindung dient dazu, die Musik und Videos des Künstlers direkt auf der Website
            abspielbar zu machen. Für YouTube gilt der Klick als Einwilligung (Art. 6 Abs. 1 lit. a
            DSGVO, soweit anwendbar); der Spotify-Player beruht auf unserem Interesse an einer
            ansprechenden Präsentation der Musik (Art. 6 Abs. 1 lit. f DSGVO, soweit anwendbar).
            Wenn Sie keine Verbindung zu Spotify wünschen, scrollen Sie nicht zum Spotify-Bereich
            oder nutzen Sie einen Inhalts- bzw. Tracking-Blocker.
          </p>

          <h3>6. Links zu anderen Diensten</h3>
          <p>
            Links zu Spotify, YouTube, TikTok, Instagram, Apple Music und weiteren Profilen öffnen
            ein neues Fenster. Erst mit dem Klick verlassen Sie diese Website; ab dann gilt die
            Datenschutzerklärung des jeweiligen Anbieters. Wir protokollieren Link-Klicks nicht und
            verwenden keine Tracking-Weiterleitungen.
          </p>

          <h3>7. Automatisch aktualisierte Inhalte</h3>
          <p>
            Neueste Videos und Veröffentlichungen werden beim Erstellen der Website auf den Servern
            des Hosting-Anbieters von öffentlichen Datenquellen (YouTube-Kanal-Feed, Apple/iTunes
            Search API) abgerufen und als statische Dateien ausgeliefert. Dabei werden keine Daten
            von Besucherinnen und Besuchern an diese Dienste übermittelt.
          </p>

          <h3>8. Speicherdauer</h3>
          <p>
            Wir speichern keine personenbezogenen Daten von Besucherinnen und Besuchern. Zur
            Speicherdauer der Zugriffsprotokolle bei Railway verweisen wir auf dessen Angaben.
          </p>

          <h3>9. Ihre Rechte</h3>
          <p>
            Sie haben – je nach anwendbarem Recht – das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Bearbeitung, Datenherausgabe und Widerspruch sowie auf Widerruf
            erteilter Einwilligungen. Anfragen richten Sie bitte an die oben genannte
            Kontaktadresse. Nach dem Schweizer Datenschutzgesetz (DSG) können Sie sich an den
            Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden; falls die
            DSGVO gilt, haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren (in Italien: Garante per la protezione dei dati personali).
          </p>

          <h3>10. Anwendbares Recht</h3>
          <p>
            Sitzland des Betreibers: <F v={l.operatorCountry} />. Welche Vorschriften (Schweizer
            DSG, DSGVO, italienische Anbieterkennzeichnung) zusätzlich gelten, richtet sich nach dem
            tatsächlichen Sitz des Betreibers und dem Zielpublikum der Website – nicht nach der
            Domainendung.
          </p>
        </div>
      </section>
    </main>
  );
}
