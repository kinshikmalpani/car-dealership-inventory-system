import { useState } from "react";
import { money, type Vehicle } from "../api";
import { VehicleImage } from "../VehicleImage";
import { useData, Feedback } from "./shared";
import { EmiCalculator } from "./EmiCalculator";
import { TestDriveForm } from "./TestDrives";
import type { Accessory } from "./types";
export function VehicleDetails({
  id,
  token,
  saved,
  onSave,
  onCompare,
}: {
  id: number;
  token: string;
  saved: boolean;
  onSave: (v: Vehicle) => void;
  onCompare: (v: Vehicle) => void;
}) {
  const {
    data: car,
    loading,
    error,
  } = useData<Vehicle>(`/vehicles/${id}`, token);
  const accessories = useData<Accessory[]>("/accessories", token);
  const [enquiry, setEnquiry] = useState(false);
  if (!car) return <Feedback loading={loading} error={error} />;
  return (
    <>
      <a className="back-link" href="#/catalogue">
        ← Back to collection
      </a>
      <section className="detail-hero">
        <div className="detail-photo">
          <VehicleImage
            image={car.image_url}
            name={`${car.make} ${car.model}`}
          />
        </div>
        <div className="detail-intro">
          <p className="eyebrow">
            {car.category} ·{" "}
            {car.seating_capacity
              ? `${car.seating_capacity} SEATS`
              : "ASK ABOUT SEATING"}
          </p>
          <p className="muted">{car.make}</p>
          <h1>{car.model}</h1>
          <p>
            {car.description ||
              "Contact the dealership for the full specification and available variants."}
          </p>
          <p className="starting-price-label">Listed ex-showroom price</p>
          <strong className="detail-price">{money(car.price)}</strong>
          <p className="fine-print">{car.price_note}</p>
          <span className="status-pill">
            {car.quantity ? "Available to order" : "Currently out of stock"}
          </span>
          <div className="detail-actions">
            <button
              className="primary"
              disabled={car.quantity === 0}
              onClick={() => {
                window.location.hash = `/checkout/${id}`;
              }}
            >
              {car.quantity ? "Review purchase →" : "Out of stock"}
            </button>
            <button className="secondary" onClick={() => setEnquiry(true)}>
              Request test drive
            </button>
          </div>
          <div className="detail-links">
            <button onClick={() => onSave(car)}>
              {saved ? "♥ Saved to wishlist" : "♡ Save to wishlist"}
            </button>
            <button onClick={() => onCompare(car)}>⇄ Add to comparison</button>
          </div>
        </div>
      </section>
      <div className="details-grid">
        <section className="content-panel">
          <p className="eyebrow">THE ESSENTIALS</p>
          <h2>Get to know your car</h2>
          <dl className="spec-grid">
            {Object.entries(car.specifications || {}).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt>Seating capacity</dt>
              <dd>
                {car.seating_capacity
                  ? `${car.seating_capacity} people`
                  : "Confirm with dealership"}
              </dd>
            </div>
          </dl>
          <ul className="feature-list">
            {car.features?.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
          {car.source_url && (
            <a
              className="source-link"
              href={car.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Manufacturer information ↗
            </a>
          )}
          <p className="fine-print">
            Specifications and equipment depend on variant. Model photography
            may show a different trim. Confirm your chosen variant and final
            quotation with the dealership.
          </p>
        </section>
        <section className="content-panel">
          <p className="eyebrow">MAKE IT YOUR OWN</p>
          <h2>Available accessories</h2>
          <p className="muted">
            Select extras during checkout. Prices below are demo estimates;
            compatibility and fitment require confirmation.
          </p>
          {accessories.data?.map((item) => (
            <div className="accessory-line" key={item.id}>
              <span>{item.name}</span>
              <strong>{money(item.price)}</strong>
            </div>
          ))}
        </section>
      </div>
      <EmiCalculator price={Number(car.price)} />
      {enquiry && (
        <TestDriveForm
          id={id}
          name={`${car.make} ${car.model}`}
          token={token}
          onClose={() => setEnquiry(false)}
        />
      )}
    </>
  );
}
