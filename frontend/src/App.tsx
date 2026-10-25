import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  errorMessage,
  money,
  currency,
  type LoginResult,
  type User,
  type Vehicle,
  type VehiclePage,
} from "./api";
import { Auth } from "./Auth";
import { VehicleCard } from "./VehicleCard";
import { Modal } from "./Modal";
import { CustomerApp, useRoute } from "./customer/CustomerApp";
import { AdminManagement } from "./AdminManagement";

type Action =
  | { kind: "new" }
  | { kind: "edit" | "restock" | "delete" | "purchase"; vehicle: Vehicle };
const initialFilters = { q: "", category: "", min_price: "", max_price: "" };

export default function App() {
  const route = useRoute();
  const management =
    route.includes("customers") ||
    route.includes("orders") ||
    route.includes("test-drives");
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("motorroom-token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(Boolean(token));
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState<VehiclePage>({ items: [], total: 0 });
  const [filters, setFilters] = useState(initialFilters);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [guide, setGuide] = useState(false);

  function logout(message = "") {
    sessionStorage.removeItem("motorroom-token");
    setToken(null);
    setUser(null);
    setPage({ items: [], total: 0 });
    setNotice(message);
    setAction(null);
    setSuccess("");
    setError("");
    setFilters(initialFilters);
    setOffset(0);
  }
  function signIn(session: LoginResult) {
    sessionStorage.setItem("motorroom-token", session.access_token);
    setToken(session.access_token);
    setUser(session.user);
    setNotice("");
  }
  useEffect(() => {
    const expired = () => logout("Your session expired. Please sign in again.");
    window.addEventListener("motorroom:session-expired", expired);
    return () =>
      window.removeEventListener("motorroom:session-expired", expired);
  }, []);
  function handleError(error: unknown) {
    if (error instanceof ApiError && error.status === 401)
      logout("Your session expired. Please sign in again.");
    else setError(errorMessage(error));
  }

  useEffect(() => {
    if (!token || user) return;
    const controller = new AbortController();
    api<User>("/auth/me", token, { signal: controller.signal })
      .then(setUser)
      .catch((error) => {
        if (!controller.signal.aborted) logout(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false);
      });
    return () => controller.abort();
  }, [token, user]);

  useEffect(() => {
    if (!user || !token || user.role !== "admin") return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({
        limit: "12",
        offset: String(offset),
        currency: legacy ? "USD" : "INR",
      });
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });
      api<VehiclePage>(`/vehicles/search?${params}`, token, {
        signal: controller.signal,
      })
        .then((result) => {
          setPage(result);
          if (offset > 0 && result.items.length === 0)
            setOffset(Math.max(0, offset - 12));
        })
        .catch((error) => {
          if (!controller.signal.aborted) handleError(error);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [token, user, filters, offset, refresh, legacy]);

  function filter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  }
  function openAction(next: Action) {
    setAction(next);
    setModalError("");
    setSuccess("");
  }
  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setModalError("");
    try {
      const vehicleId = "vehicle" in action ? action.vehicle.id : null;
      if (action.kind === "new" || action.kind === "edit") {
        const body = {
          make: data.get("make"),
          model: data.get("model"),
          category: data.get("category"),
          price: data.get("price"),
          currency: "INR",
          seating_capacity: data.get("seating_capacity")
            ? Number(data.get("seating_capacity"))
            : null,
          description: data.get("description"),
          image_url: data.get("image_url"),
          source_url: data.get("source_url"),
          price_note: data.get("price_note"),
          features: String(data.get("features") || "")
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          specifications: Object.fromEntries(
            String(data.get("specifications") || "")
              .split("\n")
              .filter((x) => x.includes(":"))
              .map((x) => {
                const i = x.indexOf(":");
                return [x.slice(0, i).trim(), x.slice(i + 1).trim()];
              }),
          ),
          ...(action.kind === "new"
            ? { quantity: Number(data.get("quantity")) }
            : {}),
        };
        await api(
          `/vehicles${action.kind === "edit" ? `/${vehicleId}` : ""}`,
          token,
          {
            method: action.kind === "edit" ? "PUT" : "POST",
            body: JSON.stringify(body),
          },
        );
      } else {
        await api(
          `/vehicles/${vehicleId}${action.kind === "delete" ? "" : `/${action.kind}`}`,
          token,
          {
            method: action.kind === "delete" ? "DELETE" : "POST",
            ...(action.kind === "restock"
              ? {
                  body: JSON.stringify({
                    quantity: Number(data.get("quantity")),
                  }),
                }
              : {}),
          },
        );
      }
      const messages = {
        new: "Vehicle added to inventory.",
        edit: "Vehicle details updated.",
        delete: "Vehicle removed from inventory.",
        restock: "Stock updated successfully.",
        purchase:
          "Purchase recorded. One vehicle has been deducted from stock.",
      };
      setSuccess(messages[action.kind]);
      setAction(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        logout("Your session expired. Please sign in again.");
      else {
        setModalError(errorMessage(error));
        setRefresh((value) => value + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  if (restoring)
    return (
      <main className="session-loading" role="status">
        Opening your showroom…
      </main>
    );
  if (!user) return <Auth onLogin={signIn} notice={notice} />;
  if (user.role === "customer")
    return <CustomerApp token={token!} user={user} onLogout={logout} />;
  const admin = user.role === "admin";
  const units = page.items.reduce(
    (total, vehicle) => total + vehicle.quantity,
    0,
  );
  const value = page.items.reduce(
    (total, vehicle) => total + Number(vehicle.price) * vehicle.quantity,
    0,
  );
  const editing = action?.kind === "edit" ? action.vehicle : null;
  const titles = {
    new: "Add a vehicle",
    edit: "Edit vehicle details",
    restock: "Restock vehicle",
    delete: "Delete vehicle",
    purchase: "Confirm purchase",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#/admin/inventory">
          <span className="brand-mark">m</span> motorroom
          <span className="brand-dot">.</span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <a className="nav-item active" href="#/admin/inventory">
          <span>▦</span> Vehicle inventory <span className="nav-arrow">↗</span>
        </a>
        <a className="nav-item" href="#/admin/customers">
          ◎ Customers
        </a>
        <a className="nav-item" href="#/admin/orders">
          ▤ Purchases & invoices
        </a>
        <a className="nav-item" href="#/admin/test-drives">
          ◷ Test-drive enquiries
        </a>
        <button className="nav-item" onClick={() => setGuide(true)}>
          <span>◷</span> Quick guide
        </button>
        <div className="sidebar-note">
          <span className="note-icon">↗</span>
          <h3>Room for what’s next.</h3>
          <p>Keep your inventory moving, one great vehicle at a time.</p>
          <span className="small-label">MOTORROOM / INVENTORY</span>
        </div>
        <div className="sidebar-footer">
          <i />
          Your dealership, connected
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="muted">Workspace</span>
            <span className="breadcrumb">/</span>
            <strong>Inventory</strong>
          </div>
          <div className="account">
            <span className="role-badge">
              {admin ? "Admin workspace" : "Customer"}
            </span>
            <span className="avatar" title={user.email}>
              {user.email.slice(0, 2).toUpperCase()}
            </span>
            <button onClick={() => logout()}>Sign out</button>
          </div>
        </header>
        <main id="inventory" className="main-content">
          {management ? (
            <AdminManagement token={token!} route={route} />
          ) : (
            <>
              {legacy && (
                <div className="alert">
                  These preserved USD listings are hidden from customers. Edit
                  each listing with a verified INR price before publishing it to
                  the Indian catalogue.
                </div>
              )}
              <section className="page-heading">
                <div>
                  <p className="eyebrow">YOUR SHOWROOM, AT A GLANCE</p>
                  <h1>
                    Vehicle inventory<span>.</span>
                  </h1>
                  <p className="muted">
                    {admin
                      ? "A clear view of every vehicle. More room for your next move."
                      : "Explore the collection. Find the vehicle that feels like you."}
                  </p>
                </div>
                {admin && (
                  <button
                    className="primary"
                    onClick={() => openAction({ kind: "new" })}
                  >
                    ＋ Add vehicle
                  </button>
                )}
              </section>
              <section className="overview" aria-label="Inventory overview">
                <div>
                  <span className="stat-icon">▦</span>
                  <div>
                    <p>Matching models</p>
                    <strong>{String(page.total).padStart(2, "0")}</strong>
                  </div>
                  <span className="stat-note">Your collection</span>
                </div>
                <div>
                  <span className="stat-icon">↗</span>
                  <div>
                    <p>Units on this page</p>
                    <strong>{String(units).padStart(2, "0")}</strong>
                  </div>
                  <span className="stat-note">Ready for a new chapter</span>
                </div>
                <div>
                  <span className="stat-icon">◈</span>
                  <div>
                    <p>Stock value on this page</p>
                    <strong className="stat-value">{legacy ? "Repricing needed" : money(value)}</strong>
                  </div>
                  <span className="stat-note">{legacy ? "Original amounts preserved" : `Listed value · ${currency}`}</span>
                </div>
              </section>
              <section className="collection">
                <div className="collection-header">
                  <h2>
                    The collection <span>{page.total}</span>
                  </h2>
                  <span className="muted collection-note">
                    Thoughtfully organized. Ready to explore.
                  </span>
                </div>
                <div className="filter-bar">
                  <div className="category-tabs" aria-label="Category filters">
                    {["", "SUV", "Sedan", "Coupe"].map((category) => (
                      <button
                        key={category}
                        aria-pressed={filters.category === category}
                        className={
                          filters.category === category ? "selected" : ""
                        }
                        onClick={() => filter("category", category)}
                      >
                        {category || "All vehicles"}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      aria-label="Search vehicles"
                      value={filters.q}
                      onChange={(event) => filter("q", event.target.value)}
                      placeholder="Search make, model, category…"
                      maxLength={100}
                    />
                  </label>
                </div>
                <div className="price-filters">
                  <span>PRICE RANGE</span>
                  <label>
                    <span className="sr-only">Minimum price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Min price"
                      value={filters.min_price}
                      onChange={(event) =>
                        filter("min_price", event.target.value)
                      }
                    />
                  </label>
                  <span>—</span>
                  <label>
                    <span className="sr-only">Maximum price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Max price"
                      value={filters.max_price}
                      onChange={(event) =>
                        filter("max_price", event.target.value)
                      }
                    />
                  </label>
                  <button
                    onClick={() => {
                      setFilters(initialFilters);
                      setOffset(0);
                    }}
                  >
                    Reset filters
                  </button>
                  <span className="result-count">
                    {page.total} {page.total === 1 ? "vehicle" : "vehicles"}{" "}
                    found
                  </span>
                </div>
                {success && (
                  <div
                    className="alert success"
                    role="status"
                    aria-label="Inventory notification"
                  >
                    ✓ {success}
                    <button
                      aria-label="Dismiss notification"
                      onClick={() => setSuccess("")}
                    >
                      ×
                    </button>
                  </div>
                )}
                {error && (
                  <div className="alert error" role="alert">
                    {error}
                    <button onClick={() => setRefresh((value) => value + 1)}>
                      Try again
                    </button>
                  </div>
                )}
                {loading ? (
                  <div
                    className="loading-grid"
                    role="status"
                    aria-label="Loading vehicles"
                  >
                    {[1, 2, 3].map((key) => (
                      <div key={key} className="skeleton" />
                    ))}
                  </div>
                ) : (
                  !error &&
                  (page.items.length ? (
                    <div className="vehicle-grid">
                      {page.items.map((vehicle) => (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          admin={admin}
                          busy={busy}
                          onPurchase={() =>
                            openAction({ kind: "purchase", vehicle })
                          }
                          onEdit={() => openAction({ kind: "edit", vehicle })}
                          onRestock={() =>
                            openAction({ kind: "restock", vehicle })
                          }
                          onDelete={() =>
                            openAction({ kind: "delete", vehicle })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span>⌕</span>
                      <h3>No vehicles found</h3>
                      <p>
                        Try another search or clear your filters.
                        {admin
                          ? " You can also add a vehicle to get started."
                          : ""}
                      </p>
                      <button
                        className="secondary"
                        onClick={() => {
                          setFilters(initialFilters);
                          setOffset(0);
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ))
                )}
                {page.total > 12 && (
                  <nav className="pagination" aria-label="Inventory pages">
                    <button
                      disabled={offset === 0 || loading}
                      onClick={() => setOffset((value) => value - 12)}
                    >
                      ← Previous
                    </button>
                    <span>
                      Page {Math.floor(offset / 12) + 1} of{" "}
                      {Math.ceil(page.total / 12)}
                    </span>
                    <button
                      disabled={offset + 12 >= page.total || loading}
                      onClick={() => setOffset((value) => value + 12)}
                    >
                      Next →
                    </button>
                  </nav>
                )}
              </section>
              <footer className="page-footer">
                <span>Motorroom — made for the road ahead.</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {action && (
        <Modal
          key={`${action.kind}-${"vehicle" in action ? action.vehicle.id : "new"}`}
          title={titles[action.kind]}
          busy={busy}
          onClose={() => setAction(null)}
        >
          <form onSubmit={submitAction}>
            {modalError && (
              <div className="alert error" role="alert">
                {modalError}
              </div>
            )}
            <fieldset disabled={busy}>
              {action.kind === "new" || action.kind === "edit" ? (
                <>
                  <div className="form-row">
                    <label>
                      Make
                      <input
                        name="make"
                        required
                        maxLength={80}
                        defaultValue={editing?.make}
                        placeholder="e.g. Toyota"
                      />
                    </label>
                    <label>
                      Model
                      <input
                        name="model"
                        required
                        maxLength={100}
                        defaultValue={editing?.model}
                        placeholder="e.g. Camry"
                      />
                    </label>
                  </div>
                  <label>
                    Category
                    <input
                      aria-label="Category"
                      name="category"
                      required
                      maxLength={50}
                      defaultValue={editing?.category}
                      list="categories"
                      placeholder="e.g. Sedan"
                    />
                    <datalist id="categories">
                      <option>SUV</option>
                      <option>Sedan</option>
                      <option>Coupe</option>
                      <option>Hatchback</option>
                      <option>Truck</option>
                      <option>Van</option>
                      <option>MPV</option>
                      <option>Electric</option>
                    </datalist>
                  </label>
                  <label>
                    Price ({currency})
                    <input
                      name="price"
                      type="number"
                      min="0"
                      max="999999999.99"
                      step="0.01"
                      required
                      defaultValue={
                        editing?.currency === "USD" ? undefined : editing?.price
                      }
                    />
                  </label>
                  <label>
                    Seating capacity
                    <select
                      name="seating_capacity"
                      defaultValue={editing?.seating_capacity || ""}
                    >
                      <option value="">Not specified</option>
                      {[4, 5, 6, 7, 8, 9].map((n) => (
                        <option key={n} value={n}>
                          {n}-seater
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      maxLength={2000}
                      defaultValue={editing?.description}
                    />
                  </label>
                  <label>
                    Model image URL
                    <input
                      name="image_url"
                      defaultValue={editing?.image_url}
                      placeholder="https://… or /images/…"
                    />
                  </label>
                  <label>
                    Manufacturer source URL
                    <input
                      name="source_url"
                      defaultValue={editing?.source_url}
                    />
                  </label>
                  <label>
                    Price basis
                    <input
                      name="price_note"
                      maxLength={500}
                      defaultValue={
                        editing?.currency === "USD"
                          ? "Verified dealership INR price"
                          : editing?.price_note || "Dealership listed price"
                      }
                    />
                  </label>
                  <label>
                    Features (one per line)
                    <textarea
                      name="features"
                      defaultValue={editing?.features?.join("\n")}
                    />
                  </label>
                  <label>
                    Specifications (one Key: Value per line)
                    <textarea
                      name="specifications"
                      defaultValue={Object.entries(
                        editing?.specifications || {},
                      )
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("\n")}
                    />
                  </label>
                  {action.kind === "new" ? (
                    <label>
                      Initial quantity
                      <input
                        name="quantity"
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        required
                        defaultValue="1"
                      />
                    </label>
                  ) : (
                    <p className="muted">
                      Use Restock to add inventory. Purchases reduce stock
                      automatically.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="modal-vehicle">
                    {action.vehicle.make} {action.vehicle.model}
                  </p>
                  {action.kind === "restock" ? (
                    <label>
                      Units to add
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max="1000000"
                        step="1"
                        required
                        defaultValue="1"
                      />
                    </label>
                  ) : (
                    <p className="muted">
                      {action.kind === "delete"
                        ? "This will permanently remove this vehicle listing from your inventory."
                        : `Record a purchase of one vehicle at ${money(action.vehicle.price)}. Stock will decrease by one. No payment is collected.`}
                    </p>
                  )}
                </>
              )}
              <div className="modal-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setAction(null)}
                >
                  Cancel
                </button>
                <button
                  className={action.kind === "delete" ? "danger" : "primary"}
                  type="submit"
                >
                  {busy
                    ? "Saving…"
                    : {
                        new: "Add vehicle",
                        edit: "Save changes",
                        restock: "Add stock",
                        delete: "Delete vehicle",
                        purchase: "Confirm purchase",
                      }[action.kind]}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
      {guide && (
        <Modal
          title="Your quick guide"
          busy={false}
          onClose={() => setGuide(false)}
        >
          <div className="guide">
            <h3>Find your next vehicle</h3>
            <p>
              Search by make, model, or category. Use category tabs and price
              filters to narrow your collection.
            </p>
            <h3>Review customer purchases</h3>
            <p>
              Use Purchases & invoices to review customer orders. Only customer
              accounts can purchase vehicles. Test-drive enquiries can be
              managed from the dedicated navigation item.
            </p>
            {admin && (
              <>
                <h3>Keep inventory up to date</h3>
                <p>
                  Add new listings, edit vehicle details, restock units, or
                  delete a listing. Changes are saved to your dealership
                  database.
                </p>
              </>
            )}
            <button className="primary" onClick={() => setGuide(false)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
