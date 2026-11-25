import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import "./merch-sandbox.css";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  front: string;
  back?: string;
  variants: { id: string; size: string; stock: number }[];
};
const legalSections = {
  imprint: "Seller details",
  privacy: "Shop privacy policy",
  payment: "Payment terms",
  delivery: "Delivery",
  returns: "Cancellation, returns and defects",
};
type Catalog = {
  products: Product[];
  shipping: number;
  legal: Record<keyof typeof legalSections, string>;
  version: string;
  allowNew: boolean;
  simulated: boolean;
  sandbox: boolean;
};
type Order = {
  reference: string;
  status: "pending" | "paid" | "expired";
  payment: string | null;
  shipping: number;
  total: number;
  checkoutUrl: string | null;
  items: { id: string; name: string; size: string; price: number; quantity: number }[];
};

const storageKey = "renzo-merch-order";
const money = (rappen: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(rappen / 100);
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
  cart,
  add,
}: {
  product: Product;
  cart: Record<string, number>;
  add: (id: string, quantity: number) => void;
}) {
  const [size, select] = useState("");
  const available = product.variants.find(({ id }) => id === size);
  const remaining = available ? Math.max(0, available.stock - (cart[size] ?? 0)) : 0;
  return (
    <article>
      <div className="merch-sandbox-photos">
        <figure className="merch-image">
          <a href={photo(product.front)} target="_blank" rel="noreferrer">
            <img src={photo(product.front)} alt={`${product.name} front view`} loading="lazy" />
          </a>
        </figure>
        {product.back && (
          <figure className="merch-image">
            <a href={photo(product.back)} target="_blank" rel="noreferrer">
              <img src={photo(product.back)} alt={`${product.name} back view`} loading="lazy" />
            </a>
          </figure>
        )}
      </div>
      <h3>
        {product.name} · {money(product.price)}
      </h3>
      <p>{product.description}</p>
      {product.variants.some(({ stock }) => stock > 0) ? (
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
              {product.variants.map(({ id, size, stock }) => (
                <option key={id} value={id} disabled={!stock}>
                  {size}
                  {stock ? "" : " · Sold out"}
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

export default function MerchShop({ onAvailability }: { onAvailability: (open: boolean) => void }) {
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
          onAvailability(result.allowNew);
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
              current.products.flatMap((p) => p.variants.map((v) => [v.id, v.stock])),
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

  async function checkStatus() {
    try {
      return await api<Order>("order", token);
    } catch (failure) {
      if ((failure as { status?: number }).status === 404) reset();
      throw failure;
    }
  }

  return (
    <section id="shop" className="artist-section merch-sandbox merch-shop">
      <div className="section-inner">
        {catalog?.simulated && <p>Local simulation. No payment or shipment.</p>}
        {catalog?.sandbox && !catalog.simulated && <p>SumUp sandbox. Test orders only.</p>}
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
              <div className="merch-products">
                {catalog.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cart={cart}
                    add={(id, quantity) =>
                      setCart((previous) => ({
                        ...previous,
                        [id]: Math.min(
                          product.variants.find((variant) => variant.id === id)?.stock ?? 0,
                          (previous[id] ?? 0) + quantity,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
              <div>
                <h3>Your cart</h3>
                {!items.length && <p>Your cart is empty.</p>}
                {items.map((item) => (
                  <div key={item.id} className="merch-sandbox-line">
                    <label>
                      {item.name} · {item.size}
                      <input
                        aria-label={`${item.name} ${item.size} quantity in cart`}
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={(event) => {
                          const number = event.target.valueAsNumber;
                          if (Number.isInteger(number) && number >= 1 && number <= item.stock)
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
                      <dt>Total</dt>
                      <dd>{money(total)}</dd>
                    </dl>
                    <form onSubmit={checkout}>
                      <h4>Shipping address · Switzerland</h4>
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
                        Place order · {money(total)}
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
              <details key={key}>
                <summary>{title}</summary>
                <p>{catalog.legal[key as keyof Catalog["legal"]]}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
