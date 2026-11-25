import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { mediaFiles } from "@/lib/media";
import "./merch-sandbox.css";

type Variant = { id: string; size: string; stock: number };
type Catalog = {
  product: { name: string; price: number; description: string; color: string; variants: Variant[] };
  shipping: number;
  simulated: boolean;
};
type Order = {
  reference: string;
  status: "pending" | "paid" | "expired";
  total: number;
  checkoutUrl: string | null;
};

const storageKey = "renzo-merch-sandbox-order";
const chf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });
const money = (rappen: number) => chf.format(rappen / 100);

async function api<T>(path: string, options?: { token?: string; body?: object }): Promise<T> {
  const headers = new Headers();
  if (options?.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options?.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/merch-sandbox/${path}`, {
    method: options?.body ? "POST" : "GET",
    headers,
    ...(options?.body && { body: JSON.stringify(options.body) }),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status });
  return data;
}

function orderToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default function MerchSandbox() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [size, setSize] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey) ?? "");
  const [order, setOrder] = useState<Order>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<Catalog>("catalog").then(setCatalog, () =>
      setError("Start the local sandbox API to use this shop."),
    );
    const storedToken = sessionStorage.getItem(storageKey);
    if (storedToken)
      void api<Order>("order", { token: storedToken }).then(setOrder, () =>
        setError("The test order could not be checked."),
      );
  }, []);

  const product = catalog?.product;
  const variant = product?.variants.find(({ id }) => id === size);
  const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
  const subtotal = items.reduce((total, item) => total + item.quantity * (product?.price ?? 0), 0);

  function updateCart(id: string, quantity: number) {
    setCart((previous) => {
      const next = { ...previous };
      if (quantity > 0) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }

  async function run(action: () => Promise<Order>) {
    setError("");
    setBusy(true);
    try {
      const result = await action();
      setOrder(result);
      if (result.status === "paid") setCart({});
    } catch (cause) {
      if (cause instanceof Error && "status" in cause && cause.status === 404) {
        reset();
      }
      setError(cause instanceof Error ? cause.message : "The test order could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    sessionStorage.removeItem(storageKey);
    setToken("");
    setOrder(undefined);
    void api<Catalog>("catalog").then(setCatalog, () => setError("Catalog unavailable."));
  }

  function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = { ...Object.fromEntries(new FormData(event.currentTarget)), country: "CH" };
    const nextToken = orderToken();
    sessionStorage.setItem(storageKey, nextToken);
    setToken(nextToken);
    void run(async () => {
      try {
        return await api<Order>("order", { token: nextToken, body: { items, address } });
      } catch (cause) {
        if (
          cause instanceof Error &&
          "status" in cause &&
          [400, 409].includes(Number(cause.status))
        )
          reset();
        throw cause;
      }
    });
  }

  return (
    <section className="artist-section merch-sandbox" aria-labelledby="merch-sandbox-title">
      <div className="section-inner">
        <h2 id="merch-sandbox-title">Merch test shop</h2>
        <p>
          Use fictional details only. Demo prices and stock apply. No real purchase or delivery.
        </p>
        {error && <p role="alert">{error}</p>}
        {catalog && product && (
          <div className="merch-sandbox-grid">
            <div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="merch-sandbox-photos">
                <img src={mediaFiles.merchPurpleHoodieFront.url} alt="Purple hoodie, front" />
                <img src={mediaFiles.merchPurpleHoodieBack.url} alt="Purple hoodie, back" />
              </div>
              <p>
                {product.color} · {money(product.price)}
              </p>
              <label htmlFor="merch-sandbox-size">Size</label>
              <select
                id="merch-sandbox-size"
                value={size}
                disabled={!!token}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="">Choose size</option>
                {product.variants.map(({ id, size, stock }) => (
                  <option key={id} value={id} disabled={!stock}>
                    {size} ({stock ? `${stock} available` : "sold out"})
                  </option>
                ))}
              </select>
              <Button
                variant="artistOutline"
                disabled={!!token || !variant || (cart[size] ?? 0) >= variant.stock}
                onClick={() => updateCart(size, (cart[size] ?? 0) + 1)}
              >
                Add to cart
              </Button>
            </div>
            <div>
              <h3>Cart</h3>
              {!items.length && !token && <p>Your cart is empty.</p>}
              {items.map(({ id, quantity }) => {
                const item = product.variants.find((option) => option.id === id);
                return (
                  <div className="merch-sandbox-line" key={id}>
                    <div>
                      <label htmlFor={`merch-sandbox-qty-${id}`}>
                        Quantity for size {item?.size}
                      </label>
                      <select
                        id={`merch-sandbox-qty-${id}`}
                        value={quantity}
                        disabled={!!token}
                        onChange={(event) => updateCart(id, Number(event.target.value))}
                      >
                        {Array.from(
                          { length: Math.max(item?.stock ?? 0, quantity) },
                          (_, index) => index + 1,
                        ).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span>{money(quantity * product.price)}</span>
                    <Button
                      variant="artistOutline"
                      disabled={!!token}
                      onClick={() => updateCart(id, 0)}
                      aria-label={`Remove size ${item?.size}`}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              {!!items.length && (
                <dl className="merch-sandbox-totals">
                  <dt>Subtotal</dt>
                  <dd>{money(subtotal)}</dd>
                  <dt>Swiss shipping</dt>
                  <dd>{money(catalog.shipping)}</dd>
                  <dt>Total</dt>
                  <dd>{money(subtotal + catalog.shipping)}</dd>
                </dl>
              )}
              {!!items.length && !token && (
                <form onSubmit={checkout}>
                  <h4>Swiss test address</h4>
                  <label>
                    Name
                    <input name="name" required maxLength={120} />
                  </label>
                  <label>
                    Street and house number
                    <input name="street" required maxLength={120} />
                  </label>
                  <label>
                    Postcode
                    <input name="postcode" required inputMode="numeric" pattern="[0-9]{4}" />
                  </label>
                  <label>
                    City
                    <input name="city" required maxLength={120} />
                  </label>
                  <label>
                    Test email
                    <input
                      name="email"
                      required
                      type="email"
                      placeholder="renzo@example.test"
                      maxLength={120}
                    />
                  </label>
                  <Button variant="artistOutline" type="submit" disabled={busy}>
                    Start test checkout
                  </Button>
                </form>
              )}
              {token && (
                <div className="merch-sandbox-order">
                  <p role="status">
                    {order
                      ? `Test order: ${order.status} · ${money(order.total)}`
                      : "Test order awaiting verification."}
                  </p>
                  {order?.checkoutUrl && (
                    <Button asChild variant="artistOutline">
                      <a href={order.checkoutUrl} rel="noreferrer">
                        Pay on SumUp sandbox
                      </a>
                    </Button>
                  )}
                  {catalog.simulated && order?.status === "pending" && (
                    <>
                      <Button
                        variant="artistOutline"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            api<Order>("simulate", { token, body: { status: "PAID" } }),
                          )
                        }
                      >
                        Simulate payment
                      </Button>
                      <Button
                        variant="artistOutline"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            api<Order>("simulate", { token, body: { status: "FAILED" } }),
                          )
                        }
                      >
                        Simulate failure
                      </Button>
                    </>
                  )}
                  {!order || order.status === "pending" ? (
                    <Button
                      variant="artistOutline"
                      disabled={busy}
                      onClick={() => void run(() => api<Order>("order", { token }))}
                    >
                      Check payment status
                    </Button>
                  ) : (
                    <Button variant="artistOutline" disabled={busy} onClick={reset}>
                      Return to test shop
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
