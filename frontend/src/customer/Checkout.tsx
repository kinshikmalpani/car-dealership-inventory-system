import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage, money, type Vehicle } from "../api";
import { VehicleImage } from "../VehicleImage";
import { useData, Feedback, PriceBreakdown } from "./shared";
import type { Accessory, Quote, Order } from "./types";

export function Checkout({ id, token }: { id: number; token: string }) {
  const car = useData<Vehicle>(`/vehicles/${id}`, token);
  const accessories = useData<Accessory[]>("/accessories", token);
  const [selected, setSelected] = useState<string[]>([]);
  const [registration, setRegistration] = useState("0");
  const [insurance, setInsurance] = useState("0");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    setError("");
    key.current = crypto.randomUUID();
    const timer = setTimeout(
      () =>
        api<Quote>(`/vehicles/${id}/quote`, token, {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            accessory_ids: selected,
            registration_estimate: registration || "0",
            insurance_estimate: insurance || "0",
          }),
        })
          .then(setQuote)
          .catch((e) => {
            if (!controller.signal.aborted) setError(errorMessage(e));
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [id, token, selected, registration, insurance]);
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const order = await api<Order>(`/vehicles/${id}/purchase`, token, {
        method: "POST",
        body: JSON.stringify({
          accessory_ids: selected,
          registration_estimate: registration || "0",
          insurance_estimate: insurance || "0",
          expected_total: quote.total,
          idempotency_key: key.current,
          buyer_name: data.get("name"),
          city: data.get("city"),
        }),
      });
      window.location.hash = `/orders/${order.reference}?confirmed=1`;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!car.data) return <Feedback loading={car.loading} error={car.error} />;
  const vehicle = car.data;
  return (
    <>
      <a className="back-link" href={`#/cars/${id}`}>
        ← Back to vehicle
      </a>
      <div className="section-heading">
        <p className="eyebrow">ONE STEP CLOSER</p>
        <h1>Make it yours.</h1>
        <p>
          Review your car, personalise the extras, and confirm your simulated
          purchase.
        </p>
      </div>
      <form className="checkout-layout" onSubmit={confirm}>
        <fieldset disabled={busy} className="checkout-main">
          <div className="checkout-car content-panel">
            <VehicleImage
              image={vehicle.image_url}
              name={`${vehicle.make} ${vehicle.model}`}
            />
            <div>
              <p className="eyebrow">YOUR SELECTION</p>
              <h2>
                {vehicle.make} {vehicle.model}
              </h2>
              <p>
                {vehicle.category} · {vehicle.seating_capacity || "—"} seats
              </p>
              <strong>{money(vehicle.price)}</strong>
            </div>
          </div>
          <section className="content-panel">
            <h2>Your details</h2>
            <div className="form-row">
              <label>
                Full name
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label>
                Registration city
                <input
                  name="city"
                  required
                  maxLength={100}
                  autoComplete="address-level2"
                />
              </label>
            </div>
          </section>
          <section className="content-panel">
            <h2>A few thoughtful extras</h2>
            <p className="muted">
              Optional accessories with indicative demo prices. Fitment must be
              confirmed for your selected car.
            </p>
            <Feedback loading={accessories.loading} error={accessories.error} />
            {accessories.data?.map((item) => (
              <label className="accessory-option" key={item.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(item.id)
                        ? current.filter((x) => x !== item.id)
                        : [...current, item.id],
                    )
                  }
                />
                <span>
                  {item.name}
                  <small>Accessory estimate</small>
                </span>
                <strong>{money(item.price)}</strong>
              </label>
            ))}
          </section>
          <section className="content-panel">
            <h2>On-road cost planning</h2>
            <p className="muted">
              Enter registration and insurance estimates from your dealer or
              insurer. These vary by location and cover. Leave zero if you do
              not yet have a quote; unquoted charges are excluded from the
              total.
            </p>
            <div className="form-row">
              <label>
                Registration estimate (₹)
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                />
              </label>
              <label>
                Insurance estimate (₹)
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                />
              </label>
            </div>
          </section>
        </fieldset>
        <aside className="content-panel checkout-summary">
          <p className="eyebrow">THE COMPLETE PICTURE</p>
          <h2>Your purchase summary</h2>
          <Feedback error={error} />
          {quote ? (
            <PriceBreakdown quote={quote} />
          ) : (
            <p role="status">Preparing your estimate…</p>
          )}
          <div className="simulation-note">
            <strong>No payment will be collected.</strong>
            <p>
              This is a simulated purchase. It reserves one unit in the demo
              inventory and saves an invoice to your account.
            </p>
          </div>
          <label className="check-consent">
            <input type="checkbox" required disabled={busy} /> I understand that
            payment is simulated and the on-road charges are estimates.
          </label>
          <button
            className="primary full"
            disabled={busy || !quote || vehicle.quantity === 0}
          >
            {busy
              ? "Confirming…"
              : vehicle.quantity === 0
                ? "Out of stock"
                : "Confirm simulated purchase"}
          </button>
        </aside>
      </form>
    </>
  );
}
