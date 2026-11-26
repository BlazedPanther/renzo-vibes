import { createFileRoute } from "@tanstack/react-router";
import { artistHead } from "@/lib/artist";
import { siteConfig, isTodo, spotifyArtistId } from "@/config/site.config";
import { openCookieSettings } from "@/lib/analytics";

export const Route = createFileRoute("/privacy")({
  head: () =>
    artistHead("Privacy Policy | Renzo Vibes", "Privacy policy of the Renzo Vibes website."),
  component: Page,
});

const F = ({ v }: { v: string }) =>
  isTodo(v) ? <span className="legal-todo">[{v}]</span> : <>{v}</>;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""} ${y}`;
};

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
          <h2>PRIVACY POLICY</h2>
          {hasTodo && (
            <p className="legal-draft">
              DRAFT – contains mandatory details that are still missing and must be reviewed legally
              by the operator before publication.
            </p>
          )}
          <p>Last updated: {formatDate(l.privacyUpdated)}</p>
          <p>
            This privacy policy explains how personal data is processed when you visit this website.
            It is based on the Swiss Federal Act on Data Protection (FADP).
          </p>

          <h3>1. Controller</h3>
          <p>
            <F v={l.operatorName} />
            <br />
            {l.operatorAddress && (
              <>
                <F v={l.operatorAddress} />
                <br />
              </>
            )}
            Country: <F v={l.operatorCountry} />
            <br />
            Email:{" "}
            <a href={`mailto:${l.contactEmail}`}>
              <F v={l.contactEmail} />
            </a>
          </p>

          <h3>2. What this website is about</h3>
          <p>
            This website provides information about the artist Renzo Vibes (music, videos,
            biography, links to social media). The artist site has no newsletter or user accounts.
            If you order merchandise, the shop processes the personal data described in section 12.
            Terms for orders are on the <a href="/merch#shop-terms">merch page</a>.
          </p>

          <h3>3. Hosting with Railway and server log files</h3>
          <p>
            The website is hosted by Railway (Railway Corporation, USA). The servers are located in
            a data centre in the Netherlands (region Europe West). When you visit the site, Railway
            processes technically necessary connection data, in particular your IP address, date and
            time, the page requested and browser and system information, in order to deliver the
            site and to ensure security. These access logs can be viewed by us in the Railway
            account for a limited time; we do not analyse them and use them at most for
            troubleshooting. The connection is encrypted (HTTPS).
          </p>

          <h3 id="cookies">4. Cookies and local storage</h3>
          <p>
            A first-party preference cookie stores your analytics choice for up to 180 days. If you
            allow analytics, a separate random browser cookie (up to 30 days) counts page views and
            returning browsers across this site. We store a hashed identifier, a calendar date and a
            page-view total. The analytics records contain no IP address, page address, referral
            information or purchase details. Analytics totals are visible only in our protected
            administration area. We do not use this data for advertising.
          </p>
          <p>
            <button className="cookie-settings-link" type="button" onClick={openCookieSettings}>
              Change analytics cookie settings
            </button>
          </p>
          <p>
            For technical reasons the site stores your scroll position in the browser's{" "}
            <em>sessionStorage</em> while you navigate (no personal data; it is deleted when you
            close the tab). If you order merchandise, a random order token is also kept there (see
            section 12). Fonts are served from this website itself; no fonts are loaded from Google
            servers.
          </p>

          <h3>5. Embedded content (Spotify, YouTube)</h3>
          <p>
            Video preview images are hosted on this website. YouTube videos are only loaded after
            you click on them; until then no connection to YouTube is made.
            {spotify &&
              " The Spotify player, by contrast, is loaded automatically as soon as you scroll to the corresponding section of the home page or the music page."}
          </p>
          <ul>
            <li>
              <strong>YouTube</strong> (after you click a video, via the domain
              youtube-nocookie.com): Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
              Ireland, or Google LLC, USA. At least your IP address and browser data are
              transmitted; YouTube may also store or read information on your device when using the
              enhanced privacy domain. Using youtube-nocookie.com does not rule out data transfers.
            </li>
            {spotify && (
              <li>
                <strong>Spotify</strong> (automatically when the player is displayed): Spotify AB,
                Regeringsgatan 19, 111 53 Stockholm, Sweden. At least your IP address and browser
                data are transmitted; Spotify may use cookies or similar technologies.
              </li>
            )}
          </ul>
          <p>
            The embeds exist so that the artist's music and videos can be played directly on the
            website. For YouTube, your click counts as your consent. If you do not want a connection
            to Spotify, do not scroll to the Spotify section or use a content or tracking blocker.
          </p>

          <h3>6. Links to other services</h3>
          <p>
            Links to Spotify, YouTube, TikTok, Instagram, Apple Music and other profiles open in a
            new window. You only leave this website when you click; from then on the privacy policy
            of the respective provider applies. We do not log link clicks and do not use tracking
            redirects.
          </p>

          <h3>7. Automatically updated content</h3>
          <p>
            Latest videos and releases are fetched from public data sources (YouTube channel feed,
            Apple/iTunes Search API) on the hosting provider's servers when the website is built and
            are delivered as static files. No visitor data is transmitted to these services in the
            process.
          </p>

          <h3>8. Disclosure of data abroad</h3>
          <p>
            Where personal data (in particular your IP address) is transmitted to the providers
            named above, this may happen in the following countries: the USA (Railway; Google LLC;
            Resend), the Netherlands (Railway servers), Ireland (Google Ireland Limited; SumUp) and
            Sweden (Spotify AB). The Netherlands, Ireland and Sweden are in the EU/EEA and are
            recognised by Switzerland as having an adequate level of data protection. For the USA,
            we rely on the safeguards that the respective provider states in its privacy policy,
            such as certification under the Swiss-US Data Privacy Framework or standard contractual
            clauses.
          </p>

          <h3>9. Retention</h3>
          <p>
            We retain opted-in analytics records in the active database for up to 30 days. If you
            withdraw your consent, we remove the analytics cookie and stop recording visits. For
            merchandise order data, see section 12. For the retention period of the access logs at
            Railway and for data processed by Google and Spotify, please refer to the respective
            provider's information.
          </p>

          <h3>10. Your rights</h3>
          <p>
            Under the Swiss FADP you have the right to information about whether and which of your
            personal data is processed (right of access), to have inaccurate data rectified, to
            request deletion of your data, to object to processing, and, where applicable, to data
            portability. You can withdraw a consent you have given at any time. Please send requests
            to the contact address above. You also have the right to lodge a complaint with the
            Federal Data Protection and Information Commissioner (FDPIC), www.edoeb.admin.ch.
          </p>

          <h3>11. Applicable law</h3>
          <p>
            This website is operated from Switzerland and is subject to Swiss law, in particular the
            FADP. If you visit the website from the EU/EEA, additional rights under the GDPR may
            apply to you; you can also use the contact address above in that case.
          </p>
          <h3>12. Merchandise orders</h3>
          <p>
            If you place an order in the shop, we process your name, email address, delivery
            address, the items ordered, the order total, the payment status and shipping details. We
            use this data to confirm and fulfil your order, to deliver the goods, to answer
            enquiries and returns and to meet legal obligations. The shop stores a random order
            token in your browser tab so that you can check your order after returning from the
            payment page; access with this token expires after 90 days.
          </p>
          <ul>
            <li>
              <strong>SumUp</strong> processes the payment on its own payment page. Card details are
              entered there and are not received by us. We receive the order reference, amount and
              payment status.
            </li>
            <li>
              <strong>Resend</strong> sends the order emails. It receives your email address and the
              content of the confirmation.
            </li>
            <li>
              <strong>Railway</strong> hosts the shop and stores the order data.
            </li>
            <li>
              <strong>Swiss Post</strong> (Die Schweizerische Post AG) delivers the parcels and
              receives the data needed for delivery (name, address).
            </li>
            <li>
              For each paid order the seller receives an internal notification email with the items
              and the delivery details (name, address, email) so that the parcel can be prepared.
              The seller's own mailbox is hosted by Google. Customers can use any email address.
            </li>
          </ul>
          <p>
            These providers may process data outside Switzerland, including in the EU/EEA and the
            USA; section 8 applies accordingly. If an order expires or is cancelled, the delivery
            address is removed from the active order database. After shipment, name, address and
            email are deleted from the shop after 90 days, unless a legal obligation or an open case
            requires longer; order emails in the seller's mailbox are deleted after the same period.
            Your rights are described in section 10.
          </p>
        </div>
      </section>
    </main>
  );
}
