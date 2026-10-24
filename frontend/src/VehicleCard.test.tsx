import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VehicleCard } from "./VehicleCard";

const vehicle = {
  id: 1,
  make: "Toyota",
  model: "Camry",
  category: "Sedan",
  price: "32500.50",
  quantity: 0,
};

describe("Vehicle card", () => {
  it("disables purchases when there is no stock", () => {
    render(
      <VehicleCard
        vehicle={vehicle}
        admin={false}
        busy={false}
        onPurchase={vi.fn()}
        onEdit={vi.fn()}
        onRestock={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
  });
  it("allows an available vehicle to be purchased", async () => {
    const purchase = vi.fn();
    render(
      <VehicleCard
        vehicle={{ ...vehicle, quantity: 2 }}
        admin={false}
        busy={false}
        onPurchase={purchase}
        onEdit={vi.fn()}
        onRestock={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /purchase/i }));
    expect(purchase).toHaveBeenCalledOnce();
  });
  it("shows administration controls only to admins", () => {
    render(
      <VehicleCard
        vehicle={vehicle}
        admin={true}
        busy={false}
        onPurchase={vi.fn()}
        onEdit={vi.fn()}
        onRestock={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /edit/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /restock/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled();
  });
});
