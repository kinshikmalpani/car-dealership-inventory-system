# Motorroom — Car Dealership Inventory

A full-stack dealership inventory application built with FastAPI, SQLite, React, TypeScript, and Tailwind CSS. Customers can register, browse, filter, and record purchases. Administrators can create and edit listings, restock units, and delete vehicles.

Purchasing records an inventory decrement of one unit. This application does not collect payments, manage orders, or arrange delivery. Vehicle artwork is original representative SVG illustration, not photography of the listed models. Example prices are in USD; configure `VITE_CURRENCY` before entering real inventory in another currency.

## Prerequisites

- Python 3.13 (tested with 3.13.3)
- Node.js 24 (tested with 24.12.0) and npm
- Git
- Two terminal windows

## Run locally on Windows (PowerShell)

Start in this repository's root directory. Use `npm.cmd` if PowerShell blocks the npm script.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste the generated value into `JWT_SECRET` in `backend/.env`. The application rejects a missing, short, or unchanged placeholder secret. Do not commit `.env`.

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.cli create-admin --email owner@example.com
.\.venv\Scripts\python.exe -m app.cli seed
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

The admin command asks for a password of at least 10 characters and confirmation. It creates a new account and never promotes an existing customer account. Choose your own email instead of `owner@example.com`. Seeding is optional and runs only when inventory is empty.

### Frontend (second terminal, from repository root)

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open [Motorroom](http://127.0.0.1:5173). Sign in with the admin account you created, or register a customer account. The frontend proxies `/api` to port 8000. Interactive API documentation is at [Swagger UI](http://127.0.0.1:8000/docs).

For macOS/Linux, replace `.venv\Scripts\python.exe` with `.venv/bin/python`, `Copy-Item` with `cp`, and `npm.cmd` with `npm`.

## Tests and production build

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q --cov=app --cov-report=term-missing --cov-report=xml:../docs/coverage.xml --junitxml=../docs/backend-tests.xml
```

From `frontend/`:

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Stop development servers on ports 8000 and 5173 before running browser tests. Playwright starts its own servers, applies real migrations to a temporary SQLite database, and creates disposable test users. Its known test credentials exist only in the isolated test database and must never be used in a deployment. Browser tests produce screenshots under `docs/screenshots/` and a JUnit report under `docs/`.

`npm run build` checks TypeScript and produces `frontend/dist/`. GitHub Actions repeats backend tests, frontend tests, the build, dependency auditing, and browser journeys. The workflow is provided locally; it runs remotely once the repository is published.

## API and permissions

Protected requests use `Authorization: Bearer <access_token>`. Register and login accept JSON `{ "email": "you@example.com", "password": "your-password" }`. Login returns the access token and user profile. Tokens expire after 30 minutes by default.

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | Public; creates customer only |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Signed-in user |
| GET | `/api/vehicles` | Signed-in user |
| GET | `/api/vehicles/search` | Signed-in user |
| POST | `/api/vehicles` | Admin |
| PUT | `/api/vehicles/:id` | Admin |
| DELETE | `/api/vehicles/:id` | Admin |
| POST | `/api/vehicles/:id/purchase` | Signed-in user |
| POST | `/api/vehicles/:id/restock` | Admin |
| GET | `/api/health` | Public |

Create fields: `make`, `model`, `category`, `price`, and `quantity`. Edit accepts all detail fields but deliberately excludes quantity; use purchase/restock to change stock. Restock accepts `{ "quantity": 3 }`. Purchase requires no body and buys one unit.

Search parameters: `q` (make/model/category), `make`, `model`, `category`, `min_price`, `max_price`, `limit` (1–100, default 12), and `offset`. Results are `{ "items": [...], "total": 6 }`, newest first. Sold-out listings remain visible with purchasing disabled. Category filters match text case-insensitively; custom categories can be found through search.

Expected errors: 401 authentication, 403 permission, 404 missing vehicle, 409 duplicate account or stock conflict, and 422 invalid input. Money is returned as a two-decimal string.

## Architecture and design decisions

```text
backend/
  app/          routes, request schemas, authentication, models, inventory service, CLI
  migrations/   versioned Alembic schema migrations
  tests/        API, concurrency, security, persistence, CLI, and migration tests
frontend/
  src/          typed API client, authentication, inventory UI, shared dialogs/cards
  e2e/          Playwright customer and admin journeys
docs/           verification reports, screenshots, and project notes
```

- SQLite is a persistent local file (`backend/dealership.db` by default), never an in-memory production store.
- Prices are integer cents in SQLite, parsed as decimal amounts at the API boundary.
- Stock changes use one conditional SQL update, preventing simultaneous buyers from overselling the last unit. Database constraints also enforce nonnegative inventory.
- Detail edits do not write stock quantities, preventing stale admin forms from overwriting purchases.
- Passwords use Argon2 hashing; JWTs use a configured signing secret and expiry. Authorization reads the current database role, so role changes take effect immediately.
- Tokens are stored in browser session storage, cleared on sign-out, and removed after a 401 response. Sign-out is local; an already-issued token remains valid until expiry. There is no password recovery, email verification, refresh-token mechanism, or server-side token revocation in this kata.
- The default deployment model is one dealership and one currency. Dashboard unit counts and stock value are explicitly scoped to the currently displayed page.
- Alembic owns schema changes. Automatic table creation is used only by isolated unit/integration tests.

For an internet-facing deployment, use HTTPS, a persistent writable SQLite volume, backups, a production process manager, and rate limiting at the application gateway. Serve the frontend and `/api` under the same origin or explicitly configure the API proxy. Serverless ephemeral storage is not appropriate for this SQLite setup. Hosting has not been selected or deployed.

## Screenshots

![Sign-in screen](docs/screenshots/sign-in.png)
![Desktop inventory](docs/screenshots/inventory-desktop.png)
![Mobile inventory](docs/screenshots/inventory-mobile.png)

## My AI Usage

OpenAI Codex was used collaboratively to interpret the brief, discuss stack options, design the architecture and tests, implement the API and frontend, troubleshoot local dependency/environment issues, run verification, and prepare documentation. The human selected FastAPI and SQLite, delegated the frontend language choice, confirmed admin permissions, and approved the supporting toolset.

AI generated substantial portions of this code and its tests. The Git history preserves failing backend acceptance tests before implementation and the subsequent passing implementation. AI-assisted commits include a co-author trailer. The project was written for this task; no existing dealership repository was copied. Official FastAPI and Tailwind documentation informed library usage:

- [FastAPI security documentation](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite)

Observed impact: AI accelerated the initial implementation and verification while exposing decisions that still needed explicit review, including permissions, stock concurrency, and dependency versions. Passing tests provide evidence for the exercised cases, not proof of production readiness. The developer should add their own interview reflection after reviewing and using the application; this section does not claim manual work or personal learning that has not occurred.

See root `PROMPTS.md` for original conversation records and `docs/TEST_REPORT.md` for verification evidence.
