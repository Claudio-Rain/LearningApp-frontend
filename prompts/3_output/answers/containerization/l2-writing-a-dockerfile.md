# L2 How do you write a configuration file (e.g., Dockerfile or Containerfile) for a containerized application?

A **Dockerfile** (or **Containerfile** in the Podman/Buildah ecosystem — they are identical in syntax) is a text file containing ordered instructions that tell a container build tool how to assemble an image layer by layer.

Include short code examples (Dockerfile, docker-compose, or CLI commands).

---

## Core Instructions

| Instruction | Purpose |
|---|---|
| `FROM` | Set the base image (must be first non-comment instruction) |
| `WORKDIR` | Set the working directory for subsequent instructions |
| `COPY` | Copy files/directories from build context into the image |
| `ADD` | Like `COPY` but also handles URLs and auto-extracts tarballs |
| `RUN` | Execute a command during the build (creates a new layer) |
| `ENV` | Set environment variables available at build and runtime |
| `ARG` | Define a build-time variable (not persisted in the image) |
| `EXPOSE` | Document which port(s) the container listens on (informational) |
| `VOLUME` | Declare a mount point for externally mounted volumes |
| `USER` | Set the user (UID/GID) for subsequent instructions and the default runtime user |
| `ENTRYPOINT` | Configure the executable that always runs |
| `CMD` | Provide default arguments to `ENTRYPOINT`, or the default command |
| `HEALTHCHECK` | Define a command Docker uses to check container health |
| `LABEL` | Add metadata key-value pairs to the image |

---

## Example 1: Node.js API (production-ready)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

LABEL org.opencontainers.image.source="https://github.com/myorg/my-app"

WORKDIR /app

# ---- dependencies layer (cached until package.json changes) ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---- final image ----
FROM base
# Copy only production dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy application source
COPY . .

# Run as a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

---

## Example 2: .NET 8 Web API (multi-stage build)

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: runtime image (much smaller — no SDK)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER app
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

---

## Example 3: Python FastAPI

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Build and Run

```bash
# Build the image
docker build -t my-app:1.0 .

# Build with a build argument
docker build --build-arg APP_ENV=production -t my-app:1.0 .

# Build a specific stage (useful for debugging)
docker build --target deps -t my-app-deps .

# Run the container
docker run -d -p 3000:3000 --name my-app my-app:1.0
```

---

## Best Practices

1. **Use multi-stage builds** to keep the final image lean — ship only what is needed at runtime, not the build toolchain.
2. **Order instructions from least to most frequently changed** to maximize layer cache hits (dependencies before source code).
3. **Run as a non-root user** (`USER`) to reduce the blast radius of a container escape.
4. **Use specific base image tags** (`node:20-alpine`, not `node:latest`) for reproducible builds.
5. **Minimize `RUN` layers** — chain commands with `&&` to avoid creating unnecessary intermediate layers.
6. **Use a `.dockerignore` file** to exclude `node_modules`, `.git`, test files, and secrets from the build context.

```
# .dockerignore
node_modules
.git
*.test.js
.env
coverage/
```
