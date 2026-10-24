import { money, type Vehicle } from "./api";

export function CarArt({
  category,
  color = "#657f76",
}: {
  category: string;
  color?: string;
}) {
  const suv = category.toLowerCase() === "suv";
  return (
    <svg viewBox="0 0 420 190" className="car-art" aria-hidden="true">
      <ellipse
        cx="213"
        cy="153"
        rx="155"
        ry="11"
        fill="#102d24"
        opacity=".09"
      />
      <path
        d={
          suv
            ? "M40 124 49 97 106 86 139 45 281 45 315 88 371 99 380 130 370 142 49 142Z"
            : "M37 125 49 107 113 92 158 58 263 58 313 94 369 107 382 134 368 143 47 143Z"
        }
        fill={color}
        stroke="#233e35"
        strokeWidth="2"
      />
      <path
        d={
          suv
            ? "M119 86 146 54 207 54 207 86Z M218 54 274 54 299 86 218 86Z"
            : "M128 92 162 67 207 67 207 92Z M217 67 258 67 294 92 217 92Z"
        }
        fill="#dbe6e2"
        stroke="#233e35"
        strokeWidth="2"
      />
      <path
        d="M210 98v35M126 98l-3 34M302 98l8 34M55 116h307"
        stroke="#233e35"
        opacity=".4"
        fill="none"
      />
      <path d="M48 111h24l-5 9H44 M352 109h19l4 10h-22" fill="#f9eed0" />
      <path
        d="M174 103h14M261 103h14"
        stroke="#dbe6e2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[105, 317].map((x) => (
        <g key={x}>
          <circle cx={x} cy="138" r="25" fill="#26352f" />
          <circle cx={x} cy="138" r="15" fill="#d7d9d3" />
          <circle cx={x} cy="138" r="7" fill="#65726b" />
          <path
            d={`M${x} 125v26M${x - 13} 138h26`}
            stroke="#8b958e"
            strokeWidth="2"
          />
        </g>
      ))}
    </svg>
  );
}

type Props = {
  vehicle: Vehicle;
  admin: boolean;
  busy: boolean;
  onPurchase: () => void;
  onEdit: () => void;
  onRestock: () => void;
  onDelete: () => void;
};

export function VehicleCard({
  vehicle,
  admin,
  busy,
  onPurchase,
  onEdit,
  onRestock,
  onDelete,
}: Props) {
  const colors = [
    "#657f76",
    "#8b969b",
    "#b6a18c",
    "#7b898e",
    "#576f69",
    "#a0a8a1",
  ];
  return (
    <article className="vehicle-card">
      <div className={`vehicle-image tone-${vehicle.id % 3}`}>
        <span className="category-badge">{vehicle.category}</span>
        <span className="vehicle-number">
          MR / {String(vehicle.id).padStart(3, "0")}
        </span>
        <CarArt
          category={vehicle.category}
          color={colors[vehicle.id % colors.length]}
        />
        <span className="illustration-label">Model illustration</span>
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
            <strong className="price">{money(vehicle.price)}</strong>
          </div>
          <button
            className="purchase-button"
            disabled={busy || vehicle.quantity === 0}
            onClick={onPurchase}
          >
            {vehicle.quantity ? "Purchase ↗" : "Out of stock"}
          </button>
        </div>
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
