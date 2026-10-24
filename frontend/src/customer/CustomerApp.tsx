import { useEffect, useState } from "react";
import { api, errorMessage, money, type User, type Vehicle } from "../api";
import { Catalogue } from "./Catalogue";
import { VehicleDetails } from "./VehicleDetails";
import { Checkout } from "./Checkout";
import { Purchases, PurchaseDetail } from "./Purchases";
import { TestDrives } from "./TestDrives";
import { EmiCalculator } from "./EmiCalculator";
import { Feedback } from "./shared";
import { VehicleImage } from "../VehicleImage";

export function useRoute() {
  const [route, setRoute] = useState(
    () => window.location.hash.slice(1) || "/catalogue",
  );
  useEffect(() => {
    const change = () => {
      setRoute(window.location.hash.slice(1) || "/catalogue");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}

export function CustomerApp({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: User;
  onLogout: (message?: string) => void;
}) {
  const route = useRoute();
  const [saved, setSaved] = useState<number[]>([]);
  const [comparing, setComparing] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    api<Vehicle[]>("/wishlist", token)
      .then((cars) => setSaved(cars.map((car) => car.id)))
      .catch((e) => setError(errorMessage(e)));
  }, [token]);
  useEffect(() => {
    setError("");
    setNotice("");
  }, [route]);
  async function save(car: Vehicle) {
    try {
      const exists = saved.includes(car.id);
      await api(`/wishlist/${car.id}`, token, {
        method: exists ? "DELETE" : "PUT",
      });
      setSaved((current) =>
        exists ? current.filter((id) => id !== car.id) : [...current, car.id],
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function compare(car: Vehicle) {
    if (comparing.some((item) => item.id === car.id))
      setComparing((current) => current.filter((item) => item.id !== car.id));
    else if (comparing.length === 3)
      setNotice("Compare up to three cars. Remove one to add another.");
    else {
      setComparing((current) => [...current, car]);
      setNotice(`${car.model} added to comparison.`);
    }
  }
  const detail = route.match(/^\/cars\/(\d+)$/);
  const checkout = route.match(/^\/checkout\/(\d+)$/);
  const order = route.match(/^\/orders\/([^?]+)(.*)$/);
  return (
    <div className="customer-shell">
      <header className="customer-header">
        <a className="brand" href="#/catalogue">
          <span className="brand-mark">m</span>motorroom
          <span className="brand-dot">.</span>
        </a>
        <nav aria-label="Customer navigation">
          {[
            ["/catalogue", "Explore cars"],
            ["/wishlist", `Wishlist (${saved.length})`],
            ["/compare", `Compare (${comparing.length})`],
            ["/orders", "My purchases"],
            ["/test-drives", "Test drives"],
          ].map(([path, title]) => (
            <a
              key={path}
              className={route === path ? "current" : ""}
              href={`#${path}`}
            >
              {title}
            </a>
          ))}
        </nav>
        <div className="customer-account">
          <span title={user.email} className="avatar">
            {user.email[0].toUpperCase()}
          </span>
          <button
            onClick={() => {
              window.location.hash = "/catalogue";
              onLogout();
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="customer-main">
        <Feedback error={error} />
        {notice && (
          <div className="alert success" role="status">
            {notice}
            <a href="#/compare">Compare cars →</a>
          </div>
        )}
        {detail ? (
          <VehicleDetails
            key={detail[1]}
            id={Number(detail[1])}
            token={token}
            saved={saved.includes(Number(detail[1]))}
            onSave={save}
            onCompare={compare}
          />
        ) : checkout ? (
          <Checkout key={checkout[1]} id={Number(checkout[1])} token={token} />
        ) : order ? (
          <PurchaseDetail
            reference={order[1]}
            token={token}
            confirmed={order[2].includes("confirmed=1")}
          />
        ) : route === "/orders" ? (
          <Purchases token={token} />
        ) : route === "/test-drives" ? (
          <TestDrives token={token} />
        ) : route === "/emi" ? (
          <EmiCalculator />
        ) : route === "/compare" ? (
          <>
            <div className="section-heading">
              <p className="eyebrow">A CLEARER PICTURE</p>
              <h1>Side by side.</h1>
              <p>
                Compare up to three cars using the available verified details.
              </p>
            </div>
            {!comparing.length ? (
              <div className="empty-state">
                <h2>Your comparison starts with a shortlist.</h2>
                <a className="primary" href="#/catalogue">
                  Explore cars
                </a>
              </div>
            ) : (
              <div className="comparison-grid">
                {comparing.map((car) => (
                  <article className="content-panel" key={car.id}>
                    <VehicleImage image={car.image_url} name={car.model} />
                    <h2>
                      {car.make} {car.model}
                    </h2>
                    <strong>{money(car.price)}</strong>
                    <dl className="spec-grid">
                      <div>
                        <dt>Category</dt>
                        <dd>{car.category}</dd>
                      </div>
                      <div>
                        <dt>Seats</dt>
                        <dd>{car.seating_capacity || "Confirm with dealer"}</dd>
                      </div>
                      {Object.entries(car.specifications || {})
                        .filter(
                          ([key]) => !["Seating", "Category"].includes(key),
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                    </dl>
                    <a className="primary" href={`#/cars/${car.id}`}>
                      View details
                    </a>
                    <button
                      className="text-button"
                      onClick={() => compare(car)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <Catalogue
            key={route === "/wishlist" ? "wishlist" : "catalogue"}
            token={token}
            saved={saved}
            comparing={comparing.map((car) => car.id)}
            onSave={save}
            onCompare={compare}
            wishlist={route === "/wishlist"}
          />
        )}
      </main>
      <footer className="customer-footer">
        <a className="brand" href="#/catalogue">
          motorroom.
        </a>
        <p>Find your car. Plan your journey. Make it yours.</p>
        <a href="#/emi">EMI calculator</a>
        <a href="#/test-drives">Test-drive enquiries</a>
      </footer>
    </div>
  );
}
