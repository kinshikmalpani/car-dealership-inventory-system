# Indian catalogue provenance

Prices were observed on 24 October 2026. These are published starting ex-showroom amounts, not live dealer offers or a guarantee about the pictured trim. The XL6 uses the published Smart Hybrid Zeta table amount. Pricing, variants, equipment and quotations can change. Dealer edits are never overwritten by repeated seeding.

| Model | Seed price (INR) | Seats | Published source |
|---|---:|---:|---|
| Maruti Suzuki Swift | 5,83,900 | 5 | [Manufacturer model page](https://www.marutisuzuki.com/arena/swift) |
| Maruti Suzuki Dzire | 6,30,600 | 5 | [Manufacturer model page](https://www.marutisuzuki.com/arena/dzire) |
| Maruti Suzuki Brezza | 7,49,900 | 5 | [Manufacturer model page](https://www.marutisuzuki.com/arena/brezza) |
| Maruti Suzuki Ertiga | 8,90,000 | 7 | [Manufacturer model page](https://www.marutisuzuki.com/arena/ertiga) |
| Maruti Suzuki XL6 | 11,52,299 | 6 | [NEXA published price table](https://az-ci-afde-prd-nexa-01-dkcjcehxewgpebhe.z01.azurefd.net/xl6/price) |
| Tata Tiago.ev | 6,99,000 | 5 | [Tata EV price page](https://prod-ev.tatamotors.com/tiago/ev/price.html) |

Seating and conservative model-level features were checked against [Swift](https://c4.marutisuzuki.com/cng/Swift), [Brezza](https://c4.marutisuzuki.com/cng/Brezza), [Dzire brochure](https://marutistoragenew.blob.core.windows.net/msilintiwebpdf/Dzire-Product-Brochure.pdf), [Ertiga brochure](https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/ertiga/document/ErtigaBrochure_6_Pgs_High_Res.pdf), [XL6 manufacturer announcement](https://www.marutisuzuki.com/corporate/media/press-releases/2022/april/the-all-new-xl6-bookings-now-open-at-nexa), and [Tiago.ev dealer specifications](https://www.kropexauto.com/toolkit/tata-tiago.ev-specifications-en-in.htm). Variant-specific power, range, mileage and safety equipment are intentionally not asserted without verified variant data.

## Photography

Five model-specific images are stored under `frontend/public/images/cars/`. Exact original manufacturer asset URLs are in [vehicle-image-sources.json](vehicle-image-sources.json). Images are credited to Maruti Suzuki / NEXA, downloaded for this local educational demo; no claim of ownership or redistribution licence is made. Obtain permission or replace them with licensed photography before public distribution. The Tiago.ev image fetch was unavailable; its card uses a clearly labelled, model-specific text fallback. Broken image URLs receive the same fallback.

## Demo assumptions

- Three units per newly seeded model are demonstration stock, not a sourced availability claim.
- Floor mats (₹1,500), car cover (₹2,500), and emergency kit (₹2,000) are explicitly labelled demo accessory estimates. Fitment and actual prices require a dealer quote.
- Registration and insurance are customer-entered estimates; zero means not quoted. No invented tax rate, state registration schedule, or insurer premium is applied.
- EMI uses a reducing-balance formula with editable interest, tenure and down payment. It is a planning calculation, not a lender offer.
- No reviews, customer counts, sales figures, or delivery promises are fabricated.
