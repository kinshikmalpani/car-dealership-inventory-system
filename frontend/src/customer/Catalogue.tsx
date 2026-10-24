import { useEffect, useState } from "react";
import { api, errorMessage, type Vehicle, type VehiclePage } from "../api";
import { VehicleCard } from "../VehicleCard";
import { Feedback } from "./shared";

type Props = {
  token: string;
  saved: number[];
  comparing: number[];
  onSave: (v: Vehicle) => void;
  onCompare: (v: Vehicle) => void;
  wishlist?: boolean;
};
export function Catalogue({
  token,
  saved,
  comparing,
  onSave,
  onCompare,
  wishlist = false,
}: Props) {
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    seating_capacity: "",
    min_price: "",
    max_price: "",
  });
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<VehiclePage>({ items: [], total: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        if (wishlist) {
          const cars = await api<Vehicle[]>("/wishlist", token, {
            signal: controller.signal,
          });
          setPage({ items: cars, total: cars.length });
        } else {
          const params = new URLSearchParams({
            limit: "12",
            offset: String(offset),
          });
          Object.entries(filters).forEach(([k, v]) => {
            if (v) params.set(k, v);
          });
          setPage(
            await api<VehiclePage>(`/vehicles/search?${params}`, token, {
              signal: controller.signal,
            }),
          );
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, filters, offset, wishlist, saved.join(",")]);
  function filter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  }
  return (
    <>
      {!wishlist ? (
        <section className="customer-hero">
          <div>
            <p className="eyebrow">FOR THE ROADS YOU CALL HOME</p>
            <h1>
              A car for every
              <br />
              <em>chapter of life.</em>
            </h1>
            <p>
              City commutes, family getaways, a first electric drive.
              <br />
              Find the car that belongs in your story.
            </p>
            <button
              className="primary"
              onClick={() =>
                document
                  .getElementById("collection")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore the collection ↗
            </button>
            <div className="hero-notes">
              <span>✓ Indian-market models</span>
              <span>✓ Transparent cost planning</span>
            </div>
          </div>
          <div className="hero-photo">
            <img src="/images/cars/ertiga.jpg" alt="Maruti Suzuki Ertiga" />
            <span>
              ROOM FOR EVERYONE
              <br />
              <strong>Explore our family MPVs</strong>
            </span>
          </div>
        </section>
      ) : (
        <div className="section-heading">
          <p className="eyebrow">KEEP THE POSSIBILITIES CLOSE</p>
          <h1>Your shortlist.</h1>
          <p>The cars you’ve saved, ready when you are.</p>
        </div>
      )}
      {!wishlist && (
        <section className="service-strip">
          <a href="#/emi">
            <span>↗</span>
            <div>
              <strong>Plan your EMI</strong>
              <small>Explore a budget that suits you</small>
            </div>
          </a>
          <a href="#/test-drives">
            <span>◷</span>
            <div>
              <strong>Experience the drive</strong>
              <small>Request a test drive from any car page</small>
            </div>
          </a>
          <a href="#/orders">
            <span>▤</span>
            <div>
              <strong>Every detail, together</strong>
              <small>Purchase records and invoices in one place</small>
            </div>
          </a>
        </section>
      )}
      <section id="collection" className="customer-collection">
        <div className="collection-header">
          <div>
            <p className="eyebrow">FIND YOUR FIT</p>
            <h2>{wishlist ? "Saved cars" : "Explore the collection"}</h2>
          </div>
          <p className="muted">
            {page.total} {page.total === 1 ? "model" : "models"} to explore
          </p>
        </div>
        {!wishlist && (
          <>
            <div className="filter-bar">
              <div className="category-tabs" aria-label="Category filters">
                {["", "Hatchback", "Sedan", "SUV", "MPV", "Electric"].map(
                  (category) => (
                    <button
                      key={category}
                      aria-pressed={filters.category === category}
                      className={
                        filters.category === category ? "selected" : ""
                      }
                      onClick={() => filter("category", category)}
                    >
                      {category || "All cars"}
                    </button>
                  ),
                )}
              </div>
              <input
                aria-label="Search vehicles"
                placeholder="Search make or model…"
                value={filters.q}
                onChange={(e) => filter("q", e.target.value)}
              />
            </div>
            <div className="customer-filters">
              <label>
                Seats
                <select
                  aria-label="Seating capacity"
                  value={filters.seating_capacity}
                  onChange={(e) => filter("seating_capacity", e.target.value)}
                >
                  <option value="">Any capacity</option>
                  {[4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>
                      {n}-seater
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Price from (₹)
                <input
                  aria-label="Minimum price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.min_price}
                  onChange={(e) => filter("min_price", e.target.value)}
                  placeholder="No minimum"
                />
              </label>
              <label>
                Price to (₹)
                <input
                  aria-label="Maximum price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.max_price}
                  onChange={(e) => filter("max_price", e.target.value)}
                  placeholder="No maximum"
                />
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setFilters({
                    q: "",
                    category: "",
                    seating_capacity: "",
                    min_price: "",
                    max_price: "",
                  });
                  setOffset(0);
                }}
              >
                Reset filters
              </button>
            </div>
          </>
        )}
        <Feedback loading={loading} error={error} />
        {!loading &&
          !error &&
          (page.items.length ? (
            <div className="vehicle-grid">
              {page.items.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  admin={false}
                  busy={false}
                  onPurchase={() => {
                    window.location.hash = `/cars/${vehicle.id}`;
                  }}
                  onView={() => {
                    window.location.hash = `/cars/${vehicle.id}`;
                  }}
                  onEdit={() => {}}
                  onRestock={() => {}}
                  onDelete={() => {}}
                  saved={saved.includes(vehicle.id)}
                  comparing={comparing.includes(vehicle.id)}
                  onSave={() => onSave(vehicle)}
                  onCompare={() => onCompare(vehicle)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>
                {wishlist
                  ? "A little inspiration goes a long way."
                  : "No cars match these filters."}
              </h2>
              <p>
                {wishlist
                  ? "Save a car from the catalogue to start your shortlist."
                  : "Try another category, seat count, or budget."}
              </p>
              {wishlist && (
                <a className="primary" href="#/catalogue">
                  Browse cars
                </a>
              )}
            </div>
          ))}
        {!wishlist && page.total > 12 && (
          <nav className="pagination" aria-label="Catalogue pages">
            <button
              disabled={offset === 0 || loading}
              onClick={() => setOffset((x) => x - 12)}
            >
              ← Previous
            </button>
            <span>
              Page {offset / 12 + 1} of {Math.ceil(page.total / 12)}
            </span>
            <button
              disabled={offset + 12 >= page.total || loading}
              onClick={() => setOffset((x) => x + 12)}
            >
              Next →
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
