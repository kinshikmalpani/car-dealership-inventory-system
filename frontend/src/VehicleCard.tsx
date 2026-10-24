import { money, type Vehicle } from "./api";
import { VehicleImage } from "./VehicleImage";

type Props = {
  vehicle: Vehicle;
  admin: boolean;
  busy: boolean;
  onPurchase: () => void;
  onEdit: () => void;
  onRestock: () => void;
  onDelete: () => void;
  onView?: () => void;
  onSave?: () => void;
  onCompare?: () => void;
  saved?: boolean;
  comparing?: boolean;
};

export function VehicleCard({
  vehicle,
  admin,
  busy,
  onPurchase,
  onEdit,
  onRestock,
  onDelete,
  onView,
  onSave,
  onCompare,
  saved,
  comparing,
}: Props) {
  return (
    <article className="vehicle-card">
      <div className={`vehicle-image tone-${vehicle.id % 3}`}>
        <span className="category-badge">{vehicle.category}</span>
        <button
          className="car-image-link"
          disabled={!onView}
          onClick={onView}
          aria-label={`View ${vehicle.make} ${vehicle.model}`}
        >
          <VehicleImage
            image={vehicle.image_url}
            name={`${vehicle.make} ${vehicle.model}`}
          />
        </button>
      </div>
      <div className="card-content">
        <div className="card-heading">
          <div>
            <p className="make">{vehicle.make}</p>
            <h3>{vehicle.model}</h3>
          </div>
          <span className={`stock ${vehicle.quantity === 0 ? "empty" : ""}`}>
            <i />
            {vehicle.quantity ? `${vehicle.quantity} in stock` : "Sold out"}
          </span>
        </div>
        <div className="card-bottom">
          <div>
            <p className="small-label">VEHICLE PRICE</p>
            <strong className="price">
              {vehicle.currency === "USD"
                ? "Requires INR repricing"
                : money(vehicle.price)}
            </strong>
          </div>
          {!admin && (
            <button
              className="purchase-button"
              disabled={busy || (!onView && vehicle.quantity === 0)}
              onClick={onView || onPurchase}
            >
              {onView
                ? "View details →"
                : vehicle.quantity
                  ? "Purchase ↗"
                  : "Out of stock"}
            </button>
          )}
        </div>
        {!admin && (
          <div className="customer-card-actions">
            <span>
              {vehicle.seating_capacity
                ? `${vehicle.seating_capacity}-seater`
                : vehicle.category}
            </span>
            {onSave && (
              <button aria-pressed={saved} onClick={onSave}>
                {saved ? "♥ Saved" : "♡ Save"}
              </button>
            )}
            {onCompare && (
              <button aria-pressed={comparing} onClick={onCompare}>
                {comparing ? "✓ Comparing" : "⇄ Compare"}
              </button>
            )}
          </div>
        )}
        {admin && (
          <div className="admin-actions">
            <button disabled={busy} onClick={onEdit}>
              Edit details
            </button>
            <button disabled={busy} onClick={onRestock}>
              ＋ Restock
            </button>
            <button disabled={busy} className="danger-text" onClick={onDelete}>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
