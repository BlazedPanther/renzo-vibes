import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { merchLegalSections as legalSections, type MerchLegal } from "@/lib/merch-legal";
import products from "../../shop/products.json";
import preorderInfo from "../../shop/preorder.json";
import "./merch-sandbox.css";
import "./merch-campaign.css";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  futurePrice?: number;
  front?: string;
  back?: string;
  frontAlt?: string;
  backAlt?: string;
  imageNote?: string;
  variants: { id: string; size: string; stock: number | null; maxQuantity?: number }[];
};
type Gift = { name: string; image: string };
export type ShopPresentation = "closed" | "standard" | "preorder";
type Catalog = {
  products: Product[];
  shipping: number;
  legal: MerchLegal;
  version: string;
  allowNew: boolean;
  simulated: boolean;
  sandbox: boolean;
  preorder?: boolean;
  notice?: string;
  gift?: Gift;
  refreshIn?: number | null;
  stockMode?: string;
};
type Order = {
  reference: string;
  status: "pending" | "paid" | "expired";
  payment: string | null;
  shipping: number;
  total: number;
  checkoutUrl: string | null;
  preorder?: boolean;
  gift?: Gift;
  fulfillment?: string;
  tracking?: string;
  items: { id: string; name: string; size: string; price: number; quantity: number }[];
};

const storageKey = "renzo-merch-order";
const money = (rappen: number) =>
  new Intl.NumberFormat("en-CH", { style: "currency", currency: "CHF" }).format(rappen / 100);
const quantityLimit = (variant?: Product["variants"][number]) =>
  variant?.stock ?? variant?.maxQuantity ?? 0;
const photo = (file: string) => `${import.meta.env.BASE_URL}media/${file}`;

async function api<T>(path: string, token?: string, body?: object): Promise<T> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/merch/${path}`, {
    method: body ? "POST" : "GET",
    headers,
    ...(body && { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw Object.assign(new Error(data?.error ?? "The shop is currently unavailable."), {
      status: response.status,
    });
  }
  return data;
}

function ProductCard({
  product,
  preorder,
  priority,
  readOnly = false,
  cart,
  add,
}: {
  product: Product;
  preorder?: boolean;
  priority?: boolean;
  readOnly?: boolean;
  cart: Record<string, number>;
  add: (id: string, quantity: number) => void;
}) {
  const [showBack, setShowBack] = useState(false);
  const image = showBack && product.back ? product.back : product.front;
  const [size, select] = useState("");
  const available = product.variants.find(({ id }) => id === size);
  const remaining = available ? Math.max(0, quantityLimit(available) - (cart[size] ?? 0)) : 0;
  return (
    <article>
      {image && (
        <div className="merch-gallery">
          <figure className="merch-image">
            <a
              href={photo(image)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${product.name} ${showBack ? "back" : "front"} image at full size (new tab)`}
            >
              <img
                key={String(showBack)}
                src={photo(image)}
                alt={
                  showBack
                    ? (product.backAlt ?? `${product.name} back view`)
                    : (product.frontAlt ?? `${product.name} front view`)
                }
                width={900}
                height={900}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
              />
              <span className="merch-gallery-zoom" aria-hidden="true">
                <ArrowUpRight size={18} />
              </span>
            </a>
          </figure>
          {product.back && (
            <div
              className="merch-gallery-views"
              role="group"
              aria-label={`Image views for ${product.name}`}
            >
              <button type="button" aria-pressed={!showBack} onClick={() => setShowBack(false)}>
                Front
              </button>
              <button type="button" aria-pressed={showBack} onClick={() => setShowBack(true)}>
                Back
              </button>
            </div>
          )}
        </div>
      )}
      <h3 className="merch-product-title">
        <span>{product.name}</span> <strong>{money(product.price)}</strong>
      </h3>
      {preorder && <p className="merch-preorder-label">Pre-order</p>}
      {!readOnly && product.futurePrice && (
        <p className="merch-introductory-advantage">
          <strong>
            {Math.floor(((product.futurePrice - product.price) * 1000) / product.futurePrice) / 10}%
            introductory discount
          </strong>
          {" · "}
          {money(product.futurePrice)} from 4 December 2026
        </p>
      )}
      {product.imageNote && <p className="merch-image-note">{product.imageNote}</p>}
      <p>{product.description}</p>
      {readOnly ? (
        <p>{product.variants.map(({ size }) => size).join(" / ")}</p>
      ) : product.variants.some((variant) => quantityLimit(variant) > 0) ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (remaining) {
              const quantity = Number(new FormData(event.currentTarget).get("quantity"));
              add(size, quantity);
            }
          }}
        >
          <label>
            Size
            <select value={size} onChange={(event) => select(event.target.value)} required>
              <option value="">Choose a size</option>
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={!quantityLimit(variant)}>
                  {variant.size}
                  {quantityLimit(variant) ? "" : " · Sold out"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              key={size}
              name="quantity"
              type="number"
              min={1}
              max={remaining || 1}
              defaultValue={1}
              disabled={!remaining}
              required
            />
          </label>
          <Button variant="artistOutline" disabled={!remaining}>
            Add to cart
          </Button>
        </form>
      ) : (
        <p>Sold out</p>
      )}
    </article>
  );
}

function CampaignHero({
  feature,
  promo,
  notice,
}: {
  feature: Pick<Product, "name" | "front" | "frontAlt" | "imageNote"> | undefined;
  promo: boolean;
  notice: string | undefined;
}) {
  return (
    <header className="merch-drop-hero">
      <div className="merch-drop-copy">
        <p className="merch-drop-eyebrow">Renzo Vibes Merch</p>
        <h1>
          {promo ? (
            <>
              BLACK <span>FRIDAY</span>
            </>
          ) : (
            <>
              WEAR THE <span>VIBE</span>
            </>
          )}
        </h1>
        <p>{notice}</p>
        <a className="merch-drop-cta" href="#merch-products">
          Explore the collection <ArrowDown size={18} aria-hidden="true" />
        </a>
      </div>
      {feature?.front && (
        <figure className="merch-drop-art">
          <img
            src={photo(feature.front)}
            alt={feature.frontAlt ?? feature.name}
            width={900}
            height={900}
            fetchPriority="high"
          />
          <figcaption>
            {feature.name}
            {feature.imageNote ? ` · ${feature.imageNote}` : ""}
          </figcaption>
        </figure>
      )}
    </header>
  );
}

function CampaignGift({ gift }: { gift: Gift }) {
  return (
    <aside className="merch-drop-gift">
      <img
        src={photo(gift.image)}
        alt="Renzo Vibes autograph card"
        width={128}
        height={128}
        loading="lazy"
      />
      <p>
        <strong>Free autograph card</strong>
        <br />
        One with each paid Black Friday order.
      </p>
    </aside>
  );
}

const campaignGift = {
  name: "Free Renzo Vibes autograph card",
  image: "black-friday-2026/autograph-card-front.webp",
};
const campaignProducts: Product[] = Object.entries(products).flatMap(([id, product]) => {
  if (!("preorder" in product)) return [];
  const sizes = id.endsWith("wintercap") ? ["One size"] : ["S", "M", "L"];
  return [
    {
      ...product,
      id,
      price: product.blackFridayPrice,
      description: "Black Friday price",
      variants: sizes.map((size) => ({ id: size, size, stock: 0 })),
    },
  ];
});

export function ClosedMerchShop() {
  return (
    <section className="artist-section merch-shop merch-drop merch-drop-closed" lang="en">
      <div className="section-inner">
        <CampaignHero
          promo
          feature={products["purple-crew-hoodie"]}
          notice="Black Friday prices run from 27 November to 3 December 2026, Swiss time. Orders and payments are closed."
        />
        <CampaignGift gift={campaignGift} />
        <section
          aria-label="Black Friday collection"
          id="merch-products"
          className="merch-products"
        >
          {campaignProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              preorder
              readOnly
              cart={{}}
              add={() => {}}
            />
          ))}
        </section>
        <aside className="merch-drop-gift" aria-label="Shipping and returns">
          <p>
            <strong>Shipping and returns</strong>
            <br />
            {preorderInfo.deliveryEstimate} CHF 7.00 per order within Switzerland. Voluntary returns within
            14 days of delivery for unworn, undamaged items.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default function MerchShop({
  onAvailability,
}: {
  onAvailability: (presentation: ShopPresentation) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<Order>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void api<Catalog>("catalog").then(
      (result) => {
        if (active) {
          setCatalog(result);
          onAvailability(result.allowNew ? (result.preorder ? "preorder" : "standard") : "closed");
        }
      },
      () => {},
    );
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      setToken(saved);
      void api<Order>("order", saved).then(
        (result) => {
          if (active) setOrder(result);
        },
        () => {},
      );
    }
    return () => {
      active = false;
    };
  }, [onAvailability]);

  useEffect(() => {
    if (catalog?.refreshIn == null) return;
    const timer = window.setTimeout(
      () => {
        void api<Catalog>("catalog").then(setCatalog, () => {});
      },
      Math.min(catalog.refreshIn + 50, 2_147_000_000),
    );
    return () => window.clearTimeout(timer);
  }, [catalog]);

  function reset() {
    sessionStorage.removeItem(storageKey);
    setToken("");
    setOrder(undefined);
    setCart({});
    setError("");
    void api<Catalog>("catalog").then(setCatalog, () => {});
  }

  async function run(action: () => Promise<Order>) {
    setBusy(true);
    setError("");
    try {
      setOrder(await action());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token || order?.status !== "pending") return;
    let active = true;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void api<Order>("order", token).then(
          (result) => {
            if (active) setOrder((current) => (current?.status === "pending" ? result : current));
          },
          () => {},
        );
      }
    }, 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token, order?.status]);

  if (!catalog && !token) return null;
  const items =
    catalog?.products.flatMap((product) =>
      product.variants
        .filter(({ id }) => (cart[id] ?? 0) > 0)
        .map((variant) => ({
          ...variant,
          maxQuantity: quantityLimit(variant),
          name: product.name,
          price: product.price,
          quantity: cart[variant.id] ?? 0,
        })),
    ) ?? [];
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const total = subtotal + (catalog?.shipping ?? 0);

  function update(id: string, quantity: number) {
    setCart((previous) => ({ ...previous, [id]: quantity }));
  }

  function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog || busy) return;
    const form = new FormData(event.currentTarget);
    const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    sessionStorage.setItem(storageKey, key);
    setToken(key);
    void run(async () => {
      try {
        return await api<Order>("order", key, {
          items: items.map(({ id, quantity }) => ({ id, quantity })),
          address: { ...Object.fromEntries(form), accepted: undefined, country: "CH" },
          total,
          version: catalog.version,
          accepted: form.get("accepted") === "yes",
        });
      } catch (failure) {
        if ([400, 409, 429, 503].includes((failure as { status?: number }).status ?? 0)) {
          sessionStorage.removeItem(storageKey);
          setToken("");
          const current = await api<Catalog>("catalog").catch(() => undefined);
          if (current) {
            setCatalog(current);
            const limits = new Map(
              current.products.flatMap((p) => p.variants.map((v) => [v.id, quantityLimit(v)])),
            );
            setCart((previous) =>
              Object.fromEntries(
                Object.entries(previous).map(([id, quantity]) => [
                  id,
                  Math.min(quantity, limits.get(id) ?? 0),
                ]),
              ),
            );
          }
        }
        throw failure;
      }
    });
  }

  const feature =
    catalog?.products.find((product) => product.id === "rr-classic-tshirt" && product.front) ??
    catalog?.products.find((product) => product.front);

  async function checkStatus() {
    try {
      return await api<Order>("order", token);
    } catch (failure) {
      if ((failure as { status?: number }).status === 404) reset();
      throw failure;
    }
  }

  return (
    <section
      id="shop"
      className={`artist-section merch-sandbox merch-shop${catalog?.preorder && !token ? " merch-drop" : ""}`}
      lang="en"
    >
      <div className="section-inner">
        {catalog?.simulated && <p>Local simulation. No payment or shipment.</p>}
        {catalog?.sandbox && !catalog.simulated && <p>SumUp sandbox. Test orders only.</p>}
        {catalog?.stockMode === "unlimited-test" && (
          <p>Unlimited test stock · no physical inventory</p>
        )}
        {catalog?.preorder && catalog.allowNew && !token && (
          <CampaignHero feature={feature} promo={!!catalog.gift} notice={catalog.notice} />
        )}
        {catalog?.gift && catalog.allowNew && !token && <CampaignGift gift={catalog.gift} />}
        {error && <p role="alert">{error}</p>}
        {token ? (
          <div className="merch-confirmation">
            <h2>
              {order?.status === "paid"
                ? "Payment confirmed"
                : order?.status === "expired"
                  ? "Checkout closed"
                  : order
                    ? "Order received"
                    : "Checking order"}
            </h2>
            {order?.payment === "REJECTED" && (
              <p>SumUp could not open the payment page. No payment was taken.</p>
            )}
            {order && (
              <>
                {order.preorder && <p className="merch-preorder-label">Pre-order</p>}
                <p>
                  Order number <strong>{order.reference}</strong>
                </p>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity} × {item.name} · {item.size}
                    </li>
                  ))}
                </ul>
                <p>
                  Shipping {money(order.shipping)} · Total {money(order.total)}
                </p>
                {order.gift && order.status !== "expired" && (
                  <p>1 × {order.gift.name} · CHF 0.00</p>
                )}
                {order.tracking && <p>Tracking: {order.tracking}</p>}
                {order.status === "pending" && (
                  <p role="status">
                    {order.payment === "FAILED"
                      ? "The payment attempt failed. You can retry while the checkout is open."
                      : "Awaiting payment confirmation."}
                  </p>
                )}
              </>
            )}
            <div className="merch-sandbox-order">
              {order?.checkoutUrl && (
                <Button asChild variant="artistOutline">
                  <a href={order.checkoutUrl} referrerPolicy="no-referrer">
                    Pay {money(order.total)} with SumUp
                  </a>
                </Button>
              )}
              {catalog?.simulated &&
                order?.status === "pending" &&
                ["PAID", "FAILED"].map((status) => (
                  <Button
                    key={status}
                    variant="artistOutline"
                    disabled={busy}
                    onClick={() => void run(() => api<Order>("simulate", token, { status }))}
                  >
                    {status === "PAID" ? "Simulate payment" : "Simulate failure"}
                  </Button>
                ))}
              {!order || order.status === "pending" ? (
                <>
                  <Button
                    variant="artistOutline"
                    disabled={busy}
                    onClick={() => void run(checkStatus)}
                  >
                    Check payment status
                  </Button>
                  {order?.payment === "REJECTED" && (
                    <p>SumUp could not open the payment page. No payment was taken.</p>
                  )}
                  {order && (
                    <Button
                      variant="artistOutline"
                      disabled={busy}
                      onClick={() => void run(() => api<Order>("cancel", token, {}))}
                    >
                      Cancel checkout
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="artistOutline" onClick={reset}>
                  Back to merch
                </Button>
              )}
            </div>
          </div>
        ) : (
          catalog?.allowNew && (
            <div className="merch-sandbox-grid">
              <div id="merch-products" className="merch-products">
                {catalog.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    preorder={!!catalog.preorder}
                    priority={index === 0}
                    cart={cart}
                    add={(id, quantity) =>
                      setCart((previous) => ({
                        ...previous,
                        [id]: Math.min(
                          quantityLimit(product.variants.find((variant) => variant.id === id)),
                          (previous[id] ?? 0) + quantity,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
              <div className="merch-cart">
                <h3>Your cart</h3>
                {catalog.preorder && <p className="merch-preorder-label">Pre-order</p>}
                {!items.length && <p>Your cart is empty.</p>}
                {items.map((item) => (
                  <div key={item.id} className="merch-sandbox-line">
                    <label>
                      {item.name} · {item.size}
                      <input
                        aria-label={`${item.name} ${item.size} quantity in cart`}
                        type="number"
                        min={1}
                        max={item.maxQuantity}
                        value={item.quantity}
                        onChange={(event) => {
                          const number = event.target.valueAsNumber;
                          if (Number.isInteger(number) && number >= 1 && number <= item.maxQuantity)
                            update(item.id, number);
                        }}
                      />
                    </label>
                    <span>{money(item.quantity * item.price)}</span>
                    <Button
                      variant="artistOutline"
                      onClick={() => update(item.id, 0)}
                      aria-label={`Remove ${item.name} ${item.size}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {items.length > 0 && (
                  <>
                    <dl className="merch-sandbox-totals">
                      <dt>Subtotal</dt>
                      <dd>{money(subtotal)}</dd>
                      <dt>Swiss shipping</dt>
                      <dd>{money(catalog.shipping)}</dd>
                      {catalog.gift && (
                        <>
                          <dt>1 × Autograph card</dt>
                          <dd>CHF 0.00</dd>
                        </>
                      )}
                      <dt>Total</dt>
                      <dd>{money(total)}</dd>
                    </dl>
                    <form onSubmit={checkout}>
                      <h4>Shipping address · Switzerland</h4>
                      {catalog.preorder && <p>{catalog.notice}</p>}
                      <label>
                        Full name
                        <input name="name" autoComplete="name" required maxLength={120} />
                      </label>
                      <label>
                        Street and house number
                        <input
                          name="street"
                          autoComplete="address-line1"
                          required
                          maxLength={120}
                        />
                      </label>
                      <label>
                        Postcode
                        <input
                          name="postcode"
                          autoComplete="postal-code"
                          required
                          inputMode="numeric"
                          pattern="[1-9][0-9]{3}"
                          maxLength={4}
                        />
                      </label>
                      <label>
                        City
                        <input name="city" autoComplete="address-level2" required maxLength={120} />
                      </label>
                      <label>
                        Email
                        <input
                          name="email"
                          autoComplete="email"
                          required
                          type="email"
                          maxLength={120}
                        />
                      </label>
                      <p>
                        Review your cart and address, place your order, then pay securely on SumUp.
                      </p>
                      <label className="merch-accept">
                        <input type="checkbox" name="accepted" value="yes" required />
                        <span>
                          I accept the <a href="#shop-terms">shop terms</a>.
                        </span>
                      </label>
                      <Button variant="artistOutline" type="submit" disabled={busy}>
                        {catalog.preorder ? "Place pre-order" : "Place order"} · {money(total)}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )
        )}
        {catalog && (
          <div id="shop-terms" className="merch-legal">
            {Object.entries(legalSections).map(([key, title]) => (
              <details key={key} id={`shop-terms-${key}`}>
                <summary>{title}</summary>
                <p>{catalog.legal[key as keyof Catalog["legal"]]}</p>
              </details>
            ))}
            <footer className="merch-legal-nav">
              <nav aria-label="Shop information">
                {Object.entries(legalSections).map(([key, title]) => (
                  <a key={key} href={`${import.meta.env.BASE_URL}merch-terms#${key}`}>
                    {title}
                  </a>
                ))}
              </nav>
            </footer>
          </div>
        )}
      </div>
    </section>
  );
}
