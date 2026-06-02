# L3 What is a multi-stage Docker build and why is it useful for production images?

## What Is a Multi-Stage Build?

A **multi-stage build** uses multiple `FROM` statements in a single Dockerfile. Each `FROM` starts a new build stage with its own filesystem. You can selectively **copy artifacts** from one stage into a later stage using `COPY --from=<stage>`.

The final image contains only what the last stage includes — all intermediate stages are discarded.

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build      # produces /app/dist

# Stage 2: production runtime
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

The final image is based on `nginx:1.27-alpine` (~45 MB), not `node:20-alpine` (~180 MB). Node.js, npm, source files, and build tooling are absent.

---

## Why It Matters for Production

### 1. Dramatically Smaller Images

| Approach | Example size |
|----------|-------------|
| Single stage (build tools + runtime) | ~900 MB (.NET SDK image) |
| Multi-stage (runtime only) | ~220 MB (.NET ASP.NET runtime image) |
| Multi-stage + distroless | ~100 MB |

Smaller images mean faster pulls, less attack surface, and lower registry storage costs.

### 2. No Build-Time Secrets or Tooling in the Image

Compilers, test frameworks, `.env` files used during build, intermediate object files, and package manager caches are confined to the build stage and never appear in the pushed image.

### 3. Separation of Concerns

Each stage has a clear responsibility. CI can target specific stages for caching, testing, and scanning independently.

---

## Full .NET Example

```dockerfile
# ── Stage 1: restore dependencies ──────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore
WORKDIR /src
COPY *.sln .
COPY src/Api/Api.csproj src/Api/
RUN dotnet restore src/Api/Api.csproj

# ── Stage 2: build & publish ───────────────────────────────────────────────
FROM restore AS publish
COPY src/ src/
RUN dotnet publish src/Api/Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Stage 3: run tests (optional, can be skipped in prod build) ────────────
FROM restore AS test
COPY tests/ tests/
RUN dotnet test tests/Api.Tests/Api.Tests.csproj --no-restore

# ── Stage 4: production runtime image ─────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
# Only the compiled output, not the SDK or source
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Run as non-root
RUN adduser --disabled-password --gecos "" appuser
USER appuser

ENTRYPOINT ["dotnet", "Api.dll"]
```

Build targets:
```bash
# Build everything including tests
docker build --target test -t myapp:test .

# Build production image (skips test stage)
docker build --target runtime -t myapp:prod .
```

---

## CI/CD Integration Pattern

```bash
# 1. Build the test stage and run tests
docker build --target test --cache-from myapp:test-cache -t myapp:test .
docker run --rm myapp:test   # fails the pipeline if tests fail

# 2. Build the production image (reuses cached layers from above)
docker build --target runtime -t myapp:prod .

# 3. Scan the production image only
trivy image myapp:prod

# 4. Push
docker push myapp:prod
```

---

## Layer Caching Strategy

Order Dockerfile instructions from **least frequently changed** to **most frequently changed** so Docker reuses cached layers:

```dockerfile
# 1. Base image (changes: rarely)
FROM node:20-alpine AS builder

# 2. System dependencies (changes: rarely)
RUN apk add --no-cache curl

# 3. Package manifests (changes: when dependencies change)
COPY package*.json ./
RUN npm ci

# 4. Application source (changes: every commit)
COPY . .
RUN npm run build
```

Changing source code invalidates only the last two layers, not the expensive `npm ci` step.

---

## Key Takeaways

- Use multi-stage builds for any language that has a separate build and runtime phase (Go, .NET, Java, TypeScript, Rust).
- The production image should contain the **minimum** needed to run — no compiler, no package manager, no source code.
- Use named stages (`AS builder`, `AS runtime`) and target them explicitly in CI with `--target`.
- Combine with a minimal base image (`alpine`, `distroless`, `chainguard`) for the smallest, most secure final image.
