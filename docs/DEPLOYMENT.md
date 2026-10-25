# Deployment

## Selected target

The owner selected **Render Free with SQLite**, accepting that accounts, purchases, enquiries, wishlists and inventory edits can disappear when Render restarts, redeploys or spins down the service. The public demo displays this limitation. Keep only fictitious data in the hosted demo. The local development database is neither uploaded nor modified by deployment.

Public source: https://github.com/kinshikmalpani/car-dealership-inventory-system

Live URL: pending deployment verification.

## Render setup

1. Sign in to Render and create a Blueprint from the public repository above, using branch `main` and root `render.yaml`.
2. Confirm the compute plan is **Free** and no persistent disk, paid database, or paid workspace upgrade is selected. Stop if the dashboard asks to incur a charge.
3. The Blueprint generates a private `JWT_SECRET`, uses `DATABASE_URL=sqlite:////tmp/dealership.db`, and checks `/api/health`.
4. Render builds the root Dockerfile: Node builds React; the Python image serves API routes and built frontend from one origin. No separate Vercel/Netlify deployment or CORS change is needed.
5. Startup applies Alembic migrations, seeds six Indian models only when the database is new, then starts one Uvicorn process on Render's `PORT`.
6. Open the assigned HTTPS URL, register a demo customer and verify catalogue, checkout, confirmation, invoice and history. A hosted reset requires registering again.
7. Add the verified live URL to the README and this document. Never describe the localhost address as a deployment.

There is no shared public administrator password. The admin workflow is demonstrated by screenshots/tests and can be exercised locally using `python -m app.cli create-admin --email owner@example.com`. If an administrator is provisioned on hosting through a secure shell, that account is also lost on reset. Do not add credentials to the repository.

## Run the container elsewhere

With Docker installed, build from the repository root:

```sh
docker build -t motorroom .
docker run --rm -p 8000:8000 -e JWT_SECRET -e DATABASE_URL=sqlite:////tmp/dealership.db motorroom
```

Set `JWT_SECRET` securely in your shell before running (at least 32 random characters). The default Docker build shows the resetting-demo notice. For persistent hosting, build with `--build-arg VITE_EPHEMERAL_DEMO=false`, mount a writable volume at `/var/data`, and use `DATABASE_URL=sqlite:////var/data/dealership.db`. Keep a single service instance for this SQLite deployment. Use SQLite's backup API for consistent backups.

`.dockerignore` excludes Git history, logs, local secrets, SQLite data and development dependencies from the image context. The runtime runs as a non-root user. Local Docker validation is unavailable because Docker is not installed on this machine; hosted verification must confirm the image builds and starts.

References: [Render free limits](https://render.com/docs/free), [Docker services](https://render.com/docs/docker), [Blueprint configuration](https://render.com/docs/blueprint-spec).
