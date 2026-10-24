import { useState } from "react";
import { errorMessage, money } from "../api";
import { VehicleImage } from "../VehicleImage";
import { useData, Feedback, PriceBreakdown, downloadInvoice } from "./shared";
import type { Order } from "./types";

export function Purchases({
  token,
  admin = false,
}: {
  token: string;
  admin?: boolean;
}) {
  const { data, loading, error } = useData<Order[]>(
    admin ? "/admin/orders" : "/orders",
    token,
  );
  return (
    <>
      <div className="section-heading">
        <p className="eyebrow">
          {admin ? "PURCHASE MANAGEMENT" : "YOUR MOTORROOM"}
        </p>
        <h1>{admin ? "Customer purchases" : "Your journeys start here."}</h1>
        <p>
          {admin
            ? "Review customer orders, itemized estimates, and invoices."
            : "Every purchase, every detail. Always in one place."}
        </p>
      </div>
      <Feedback loading={loading} error={error} />
      {data?.length === 0 && (
        <div className="empty-state">
          <h2>No purchases yet</h2>
          <p>Your confirmed purchases and invoices will appear here.</p>
          {!admin && (
            <a className="primary" href="#/catalogue">
              Explore cars →
            </a>
          )}
        </div>
      )}
      <div className="order-list">
        {data?.map((order) => (
          <a
            className="content-panel order-row"
            href={`#/orders/${order.reference}`}
            key={order.reference}
          >
            <VehicleImage
              image={order.summary.vehicle.image_url}
              name={order.summary.vehicle.model}
            />
            <div>
              <span className="status-pill">Payment simulated</span>
              <h2>
                {order.summary.vehicle.make} {order.summary.vehicle.model}
              </h2>
              <p>
                {new Date(order.created_at).toLocaleDateString("en-IN")} ·{" "}
                {order.reference}
              </p>
              {admin && (
                <p>
                  {order.buyer_name} · {order.customer_email}
                </p>
              )}
            </div>
            <div>
              <strong>{money(order.summary.total)}</strong>
              <p>View purchase & invoice ↗</p>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}

export function PurchaseDetail({
  reference,
  token,
  confirmed = false,
}: {
  reference: string;
  token: string;
  confirmed?: boolean;
}) {
  const {
    data: order,
    loading,
    error,
  } = useData<Order>(`/orders/${encodeURIComponent(reference)}`, token);
  const [downloadError, setDownloadError] = useState("");
  if (!order) return <Feedback loading={loading} error={error} />;
  return (
    <>
      <a className="back-link" href="#/orders">
        ← Purchase history
      </a>
      <div className="section-heading">
        <p className="eyebrow">
          {confirmed ? "A NEW CHAPTER" : "PURCHASE DETAILS"}
        </p>
        <h1>{confirmed ? "Great choice!" : "Your purchase, in detail."}</h1>
        <p>
          {confirmed
            ? "Your simulated purchase is confirmed and saved to your account."
            : order.reference}
        </p>
      </div>
      <div className="checkout-layout">
        <section className="content-panel">
          <VehicleImage
            image={order.summary.vehicle.image_url}
            name={order.summary.vehicle.model}
            className="confirmation-image"
          />
          <h2>
            {order.summary.vehicle.make} {order.summary.vehicle.model}
          </h2>
          <dl className="spec-grid">
            <div>
              <dt>Order reference</dt>
              <dd>{order.reference}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>{order.buyer_name}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{order.city || "Not provided"}</dd>
            </div>
            <div>
              <dt>Purchased on</dt>
              <dd>{new Date(order.created_at).toLocaleString("en-IN")}</dd>
            </div>
          </dl>
          <div className="simulation-note">
            Payment simulated — no money has been collected.
          </div>
        </section>
        <aside className="content-panel">
          <h2>Purchase summary</h2>
          <PriceBreakdown quote={order.summary} />
          <p className="fine-print">{order.summary.estimate_note}</p>
          <Feedback error={downloadError} />
          <button
            className="primary full"
            onClick={() =>
              downloadInvoice(order.reference, token).catch((e) =>
                setDownloadError(errorMessage(e)),
              )
            }
          >
            Download invoice
          </button>
          <p className="fine-print">
            Downloads a printable HTML invoice. Open it and choose Print → Save
            as PDF for a PDF copy. This demo record is not a tax invoice.
          </p>
        </aside>
      </div>
    </>
  );
}
