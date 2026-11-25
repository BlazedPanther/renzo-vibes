import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { MerchRelease } from "@/config/merch-release";
import { formatChf, prepareMerchRequest } from "@/lib/merch-request";
import "./merch-request.css";

export function MerchRequest({ release }: { release: MerchRelease }) {
  const [selection, setSelection] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const variants = release.products.flatMap((product) => product.variants);
  const variant = variants.find(({ id }) => id === selection);
  const remaining = variant ? Math.min(10, variant.quantity) - (cart[variant.id] ?? 0) : 0;
  const request = prepareMerchRequest(release, cart);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!variant || quantity < 1 || quantity > remaining || !Number.isSafeInteger(quantity)) return;
    setCart({ ...cart, [variant.id]: (cart[variant.id] ?? 0) + quantity });
    setQuantity(1);
  }

  function remove(id: string) {
    setCart(Object.fromEntries(Object.entries(cart).filter(([key]) => key !== id)));
  }

  return (
    <section
      className="artist-section merch-request"
      id="merch-request"
      lang="de-CH"
      aria-labelledby="merch-request-title"
    >
      <div className="section-inner">
        <h2 id="merch-request-title">Merch anfragen</h2>
        <p>
          Renzo prüft deine Anfrage, bestätigt Bestand und Endbetrag und sendet dir einen einmaligen
          SumUp-Zahlungslink. Versand innerhalb der Schweiz.
        </p>
        <div className="merch-request-grid">
          <form onSubmit={add}>
            <label htmlFor="merch-variant">Artikel und Grösse</label>
            <select
              id="merch-variant"
              value={selection}
              onChange={(event) => {
                setSelection(event.target.value);
                setQuantity(1);
              }}
            >
              <option value="">Bitte wählen</option>
              {release.products.map((product) => (
                <optgroup key={product.id} label={`${product.name} · ${product.color}`}>
                  {product.variants.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.quantity === 0}>
                      {option.size} · {formatChf(option.rappen)}
                      {option.quantity === 0 ? " · Ausverkauft" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label htmlFor="merch-quantity">Menge</label>
            <select
              id="merch-quantity"
              disabled={remaining < 1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            >
              {Array.from({ length: Math.max(1, remaining) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <Button variant="artistOutline" type="submit" disabled={remaining < quantity}>
              Zur Anfrage hinzufügen
            </Button>
          </form>
          <div>
            <h3>Deine Anfrage</h3>
            {!request.href && <p>Wähle zuerst einen Artikel.</p>}
            {request.lines.length > 0 && (
              <>
                <ul className="merch-request-lines">
                  {request.lines.map((line) => (
                    <li key={line.id}>
                      <span>
                        {line.units} × {line.product} · {line.color} · {line.size}
                        <br />
                        {formatChf(line.lineTotal)}
                      </span>
                      <Button
                        variant="artistOutline"
                        onClick={() => remove(line.id)}
                        aria-label={`${line.product} in ${line.size} entfernen`}
                      >
                        Entfernen
                      </Button>
                    </li>
                  ))}
                </ul>
                <dl className="merch-request-total" aria-live="polite">
                  <dt>Warenwert</dt>
                  <dd>{formatChf(request.subtotal)}</dd>
                  <dt>Versand Schweiz</dt>
                  <dd>{formatChf(release.delivery.rappen)}</dd>
                  <dt>Voraussichtlicher Gesamtbetrag</dt>
                  <dd>{formatChf(request.total)}</dd>
                </dl>
                {request.href && (
                  <Button asChild variant="artistOutline">
                    <a href={request.href}>E-Mail-Anfrage öffnen</a>
                  </Button>
                )}
                <details>
                  <summary>E-Mail von Hand senden</summary>
                  <p>Empfänger: {release.seller.orders}</p>
                  <textarea
                    readOnly
                    aria-label="Anfragetext zum Kopieren"
                    value={request.message}
                    rows={8}
                  />
                </details>
              </>
            )}
            <p>
              Die Anfrage ist unverbindlich. Die Lieferadresse klärst du direkt mit Renzo per
              E-Mail.
            </p>
          </div>
        </div>
        <div className="merch-request-terms" id="merch-legal">
          <h3>Versand und Kaufbedingungen</h3>
          <p>
            Schweizer Versand {formatChf(release.delivery.rappen)}. {release.delivery.estimate}
          </p>
          <p>
            <strong>Storno</strong> {release.cancellations}
          </p>
          <p>
            <strong>Rückgabe</strong> {release.returns}
          </p>
          <p>
            Bei einem Mangel wende dich bitte an {release.seller.orders}. Die gesetzlichen
            Mängelrechte bleiben vorbehalten.
          </p>
          <h3>Impressum</h3>
          <address>
            {release.seller.name}
            <br />
            {release.seller.address}
            <br />
            {release.seller.orders}
            {release.seller.registration && (
              <>
                <br />
                {release.seller.registration}
              </>
            )}
          </address>
          <Link to="/privacy" hash="merch-privacy">
            Datenschutzerklärung für Bestellanfragen
          </Link>
        </div>
      </div>
    </section>
  );
}
