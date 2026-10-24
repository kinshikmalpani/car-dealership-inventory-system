# Verification report

Verified locally on 24 October 2026 with Python 3.13.3, Node.js 24.12.0, and Windows. Results below describe executed checks; hosted CI has not yet run.

| Check | Result |
|---|---|
| Backend pytest suite | 23 passed |
| Backend statement coverage | 293 / 294 statements; 99% rounded |
| React component tests | 3 passed |
| Playwright Chromium journeys | 5 passed |
| TypeScript check and production build | Passed |
| npm dependency audit | 0 reported vulnerabilities |
| Desktop layout | 1440 px wide; no horizontal overflow |
| Mobile layout | 390 px wide; no horizontal overflow |

## What is covered

- Registration, duplicate email, input validation, login, and current-user lookup.
- Rejection of self-assigned admin roles and unauthorized inventory operations.
- Expired/tampered tokens, deleted accounts, and immediate role changes.
- Vehicle creation, search combinations, price filtering, pagination, editing, and deletion.
- Purchasing, zero stock, positive-only restocking, upper stock limits, and missing vehicles.
- Five simultaneous purchase requests for a single remaining unit: exactly one success.
- Persistence across application restarts, schema upgrades/downgrades, repeatable sample seeding, and admin provisioning.
- Frontend sold-out behavior, purchase callbacks, and role-specific controls.
- Real browser customer purchase/session flow; admin CRUD/restock flow; registration and failed login; filters and validation; desktop/mobile dialogs and screenshots.

Machine-readable evidence: `backend-tests.xml`, `coverage.xml`, and `browser-tests.xml`. Screenshots are in `screenshots/`.

## TDD evidence

Git commit `7cb9c50` introduced backend acceptance tests and frontend card expectations before implementation. Commit `6bb5580` established the database harness while backend endpoints still failed their expected behavior. Commit `6317cd4` implemented the API with all initial 16 backend tests passing. Later changes added migration/security/CLI checks and browser verification. This records the actual development sequence; not every later test was authored before its implementation.

## Verification notes and limits

- Browser tests use an isolated SQLite database created through Alembic; they never modify the normal dealership database.
- In this restricted Windows environment, Playwright's automatic child-process cleanup stalled. The successful browser run used explicitly started test servers and `E2E_EXTERNAL_SERVERS=1`; all five tests completed with exit code 0. Normal CI uses Playwright-managed servers.
- pytest temporary files were placed in the workspace after an environment permission interruption. This did not require changing application behavior.
- The installed Starlette version emits a deprecation warning for its HTTPX TestClient integration. The supported integration still passes all tests; this is not suppressed.
- Coverage is statement coverage, not a measure of every possible input or proof of production security.
- Chromium was verified; Firefox, Safari, load testing, deployment, and hosted CI were not run.
- No payment processor, order history, email delivery, or password recovery is in scope.
