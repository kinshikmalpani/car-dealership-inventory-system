FROM node:24-bookworm-slim AS frontend
WORKDIR /build
ARG VITE_EPHEMERAL_DEMO=true
ENV VITE_EPHEMERAL_DEMO=$VITE_EPHEMERAL_DEMO
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend/dist DATABASE_URL=sqlite:////var/data/dealership.db PORT=8000
WORKDIR /app/backend
COPY backend/requirements.lock.txt ./
RUN pip install --no-cache-dir -r requirements.lock.txt
COPY backend/ ./
COPY --from=frontend /build/dist /app/frontend/dist
RUN useradd --create-home --uid 10001 motorroom && mkdir -p /var/data && chown motorroom:motorroom /var/data
USER motorroom
EXPOSE 8000
CMD ["python", "-m", "app.serve"]
