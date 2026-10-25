# Verification report

Verified locally on 24–25 October 2026 with Python 3.13.3, Node.js 24.12.0, and Windows. These are executed local checks; hosted CI has not run.

| Check | Result |
|---|---|
| Backend pytest suite | 34 passed |
| Backend statement coverage | 603 / 625 statements; 96% rounded |
| React component / finance tests | 7 passed |
| Playwright Chromium journeys | 8 passed |
| TypeScript check and production build | Passed |
| Desktop layout | 1440 px; no horizontal overflow |
| Mobile catalogue, inventory and checkout | 390 px; no horizontal overflow |
| Existing database upgrade | 3 accounts and 6 original vehicles preserved; 6 INR listings added |

The original regression baseline was 23 backend tests and 3 component tests. All preserved behavior is covered with intentional changes to customer-only purchasing and INR catalogue defaults. No dependencies were added for this enhancement; a fresh dependency audit was not run.

## Exercised behavior

- Existing authentication, duplicate registration, invalid credentials, token expiry/tampering, role changes and protected inventory operations.
- Inventory CRUD, stock limits, search, pagination, seating filters and additive vehicle metadata.
- Quote arithmetic, accessories, invalid inputs, changed/tampered totals and large valid vehicle prices.
- Five simultaneous buyers for one unit: exactly one success; concurrent identical idempotency keys produce one order. An injected order-write failure rolls the stock decrement back.
- Admin purchase rejection; customers cannot access another customer's orders or invoices. Admin management endpoints reject customer accounts.
- Order snapshots and invoices persist after vehicle deletion; wishlist and test-drive ownership are enforced.
- Schema upgrade/downgrade, repeatable seeding, and preservation of legacy account hashes, prices and stock.
- Browser customer purchase with extras, confirmation, invoice download, history persistence and sign-out; admin add/edit/restock/delete; enquiry submission and admin status update; customer registration and validation.
- Saved wishlist after reload, comparison, seating filters, correct model photos/fallbacks, INR grouping, and customer screens without internal inventory statistics.
- Legacy USD listings require an explicit INR price; the admin summary never displays legacy dollar amounts as rupees. Repricing publishes the listing to the INR catalogue.
- Desktop/mobile screenshots and a separate visual check of details and checkout. Browser tests verify the five available photos load.

Machine-readable evidence: [backend-tests.xml](backend-tests.xml), [coverage.xml](coverage.xml), [browser-tests.xml](browser-tests.xml). Screenshots are under [screenshots](screenshots/).

## TDD evidence

Original commits `7cb9c50`, `6bb5580` and `6317cd4` preserve the initial red/green sequence. Enhancement commit `ed5e864` added six new acceptance tests before implementation; the observed run had 23 existing passes and six new failures. Later regression tests first reproduced the high-total validation bug (422 instead of 200) and legacy summary currency bug before their fixes. Additional integration/UI tests were developed alongside the UI; strict test-first ordering was not achieved for every component.

## Local upgrade

Before the upgrade, the original backend was stopped and a SQLite backup was created at `work/dealership-before-india-20261025-005517.db` relative to the task workspace (outside this repository). Migration `0002` and idempotent seeding completed. Direct before/after comparisons verified all existing user rows and all six vehicles' IDs, make/model/category, prices and quantities were unchanged. The new catalogue contains six INR vehicles; six legacy USD vehicles remain restricted to admin repricing. Backend health and frontend on ports 8000/5173 returned HTTP 200 after restart. No real-account test purchase was made.

## Limits and remaining work

- Payments are simulated by design. No payment gateway, delivery scheduling, email/SMS delivery, or confirmed test-drive appointment integration exists.
- The downloadable invoice is printable HTML; users can save it as PDF through their browser. It is labelled a demo purchase record, not a GST tax invoice.
- Registration/insurance require entered estimates; no state-specific statutory calculator or live insurance quote is integrated. Accessory estimates are explicitly illustrative.
- Five manufacturer images are available; Tiago.ev uses a labelled fallback. Detailed variant-level specifications and multiple-image galleries remain future catalogue enrichment; no specifications were invented to fill gaps.
- Previously completed inventory-only purchases cannot be reconstructed because the original app did not save order records.
- Comparison selection lasts for the current UI session; wishlists persist in SQLite.
- Playwright-managed child-process cleanup stalled on this restricted Windows host. The successful run used isolated servers on ports 8001/5174, `E2E_EXTERNAL_SERVERS=1`, and `E2E_BASE_URL=http://127.0.0.1:5174`. The normal local app/data were separate from browser fixtures.
- pytest used an explicit workspace temporary directory because the default Windows pytest temp directory was inaccessible. The installed Starlette HTTPX TestClient deprecation warning remains visible.
- Coverage measures statements, not every input or production readiness. Firefox, Safari, load tests, hosted CI and deployment were not run. Original authentication limitations (no password recovery/email verification/token revocation) remain documented in README.

## Deployment preparation checks

Two additional backend tests verify production static files, API authentication and 404 behavior, traversal protection, and migration/first-start-only catalogue seeding. The frontend-serving test was observed failing before implementation (commit `355fa1c`). The final backend run passed all 34 tests. Docker is not installed on the local host, so the container image itself has not yet been built here. Hosted build/deployment status is recorded separately; local test results do not imply successful hosting.
