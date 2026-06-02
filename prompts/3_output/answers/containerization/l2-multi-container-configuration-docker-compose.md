# L2 How do you maintain a multi-container configuration (e.g., using Docker Compose or a similar tool)?

## What is Docker Compose?

**Docker Compose** is a tool for defining and running multi-container applications using a single declarative YAML file (`docker-compose.yml` or `compose.yml`). It manages the full lifecycle: build, start, stop, networking, volumes, and dependency ordering.

Include short code examples (Dockerfile, docker-compose, or CLI commands).

---

## Anatomy of a `docker-compose.yml`

```yaml
# docker-compose.yml
name: my-app   # project name (used as prefix for containers/networks/volumes)

services:
  # ── Application API ──────────────────────────────────────────
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: runtime          # use a specific multi-stage build target
    image: myorg/my-api:1.0   # tag the built image
    container_name: my-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://app:secret@db:5432/appdb
      REDIS_URL: redis://cache:6379
    env_file:
      - .env.production        # load extra vars from a file
    depends_on:
      db:
        condition: service_healthy   # wait for health check to pass
      cache:
        condition: service_started
    volumes:
      - uploads:/app/uploads   # named volume for persistent uploads
    networks:
      - backend
      - frontend

  # ── PostgreSQL Database ──────────────────────────────────────
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pg-data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Redis Cache ──────────────────────────────────────────────
  cache:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis-data:/data
    networks:
      - backend

  # ── Nginx Reverse Proxy ──────────────────────────────────────
  proxy:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - api
    networks:
      - frontend

volumes:
  pg-data:
  redis-data:
  uploads:

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

---

## Environment-Specific Overrides

Use multiple Compose files to manage differences between environments without duplicating the base config.

```yaml
# docker-compose.override.yml  (merged automatically in development)
services:
  api:
    build:
      target: dev              # use development build stage
    volumes:
      - ./api:/app             # mount source for hot-reload
    environment:
      NODE_ENV: development
    command: npm run dev

  db:
    ports:
      - "5432:5432"            # expose DB port for local tooling only in dev
```

```bash
# Development (base + override merged automatically)
docker compose up

# Production (explicit file selection, no override)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Common Compose CLI Commands

```bash
# Start all services (build if needed)
docker compose up -d

# Build (or rebuild) images without starting
docker compose build

# Force rebuild even if cache is valid
docker compose build --no-cache

# View logs (all services or a specific one)
docker compose logs -f
docker compose logs -f api

# List running services
docker compose ps

# Run a one-off command in a service container
docker compose run --rm api npm run migrate

# Execute a command in a running container
docker compose exec api sh

# Stop and remove containers (preserves volumes)
docker compose down

# Stop and remove containers AND volumes
docker compose down -v

# Scale a service to N replicas
docker compose up -d --scale api=3
```

---

## Maintaining the Configuration Over Time

1. **Pin image tags** — use `postgres:16-alpine` not `postgres:latest` so updates are intentional.
2. **Use health checks and `depends_on` conditions** — prevents race conditions at startup.
3. **Separate secrets from config** — use `.env` files (or Docker secrets in Swarm mode) rather than hardcoding credentials.
4. **Use named volumes** for stateful services — avoid bind-mounting database data directories.
5. **Split networks** — keep internal services (`backend`) separate from publicly routed ones (`frontend`).
6. **Keep a `.env` file for local overrides** — Docker Compose automatically reads `.env` for variable substitution.

```bash
# .env
POSTGRES_PASSWORD=local_dev_only
IMAGE_TAG=latest
```

```yaml
# Reference in compose file
services:
  db:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```
