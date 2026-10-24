"""Sourced starting-price listings; seeding never overwrites dealer edits."""
from sqlalchemy import select
from app.models import Vehicle

# Prices observed on the linked manufacturer pages on 2026-10-24. These are
# starting prices, not a promise that every photographed trim costs this amount.
INDIA_CARS = [
    ("Maruti Suzuki", "Swift", "Hatchback", 583900, 5, "swift", "https://www.marutisuzuki.com/arena/swift", "A compact five-seat hatchback for everyday city journeys.", "Petrol", ["Five-seat cabin", "Compact hatchback layout"]),
    ("Maruti Suzuki", "Dzire", "Sedan", 630600, 5, "dzire", "https://www.marutisuzuki.com/arena/dzire", "A five-seat sedan with a separate boot for family journeys.", "Petrol", ["Five-seat cabin", "Sedan body with separate boot"]),
    ("Maruti Suzuki", "Brezza", "SUV", 749900, 5, "brezza", "https://www.marutisuzuki.com/arena/brezza", "A five-seat SUV in Maruti Suzuki’s Indian model range.", "Petrol", ["Five-seat cabin", "SUV body style"]),
    ("Maruti Suzuki", "Ertiga", "MPV", 890000, 7, "ertiga", "https://www.marutisuzuki.com/arena/ertiga", "A three-row, seven-seat MPV with flexible seating for family trips.", "Petrol", ["Seven seats", "Three-row seating", "Flexible seating layout"]),
    ("Maruti Suzuki", "XL6", "MPV", 1152299, 6, "xl6", "https://az-ci-afde-prd-nexa-01-dkcjcehxewgpebhe.z01.azurefd.net/xl6/price", "A six-seat MPV with second-row captain seats. Listed price is the published Smart Hybrid Zeta price.", "Petrol / smart hybrid", ["Six seats", "Second-row captain seats"]),
    ("Tata", "Tiago.ev", "Electric", 699000, 5, "tiago", "https://prod-ev.tatamotors.com/tiago/ev/price.html", "An electric hatchback for everyday travel. Battery, range and equipment vary by variant; confirm the selected variant before a real purchase.", "Electric", ["Five-seat cabin", "Electric powertrain", "Hatchback body style"]),
]


def seed_india(session):
    added = False
    for make, model, category, rupees, seats, image, source, description, fuel, features in INDIA_CARS:
        if session.scalar(select(Vehicle.id).where(Vehicle.make == make, Vehicle.model == model, Vehicle.currency == "INR")):
            continue
        session.add(Vehicle(make=make, model=model, category=category, price_cents=rupees * 100, quantity=3, currency="INR", seating_capacity=seats, description=description, image_url=f"/images/cars/{image}.{'jpg' if image == 'ertiga' else 'png'}" if image != "tiago" else "", source_url=source, specifications={"Seating": f"{seats} people", "Category": category, "Powertrain": fuel, "Market": "India"}, features=features, price_note="Manufacturer published starting ex-showroom price, checked 24 Oct 2026; variant and dealer quotation may differ."))
        added = True
    session.commit()
    return added
