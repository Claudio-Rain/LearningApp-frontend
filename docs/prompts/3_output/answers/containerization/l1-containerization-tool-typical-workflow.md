# L1 Which containerization tool do you use, and can you walk through a typical workflow with it?

## Tool of Choice: Docker

**Docker** is the most widely adopted containerization platform. It consists of:

- **Docker Engine** (`dockerd` + `containerd`) — the runtime daemon
- **Docker CLI** (`docker`) — command-line interface
- **Docker Compose** — multi-container orchestration via YAML
- **Docker Hub** — the default public image registry

Other popular tools include **Podman** (daemonless, rootless, drop-in CLI replacement) and **nerdctl** (Docker-compatible CLI for containerd). The workflows below apply equally to Podman with `podman` replacing `docker`.

---

## Typical Development Workflow

### 1. Write a Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

### 2. Build an Image

```bash
# Build and tag the image
docker build -t my-app:1.0 .

# Verify it was created
docker images my-app
```

### 3. Run a Container Locally

```bash
# Run interactively (attach to stdout)
docker run --rm -p 3000:3000 --name my-app-dev my-app:1.0

# Run detached (background)
docker run -d -p 3000:3000 --name my-app-dev my-app:1.0
```

### 4. Inspect and Debug

```bash
# View running containers
docker ps

# Follow logs
docker logs -f my-app-dev

# Open a shell inside the running container
docker exec -it my-app-dev sh

# Inspect container metadata (IP, mounts, env vars, etc.)
docker inspect my-app-dev
```

### 5. Stop and Clean Up

```bash
docker stop my-app-dev
docker rm my-app-dev
```

### 6. Push to a Registry

```bash
# Log in to Docker Hub
docker login

# Tag the image with the registry path
docker tag my-app:1.0 myusername/my-app:1.0

# Push
docker push myusername/my-app:1.0
```

### 7. Pull and Run on Another Machine

```bash
docker pull myusername/my-app:1.0
docker run -d -p 3000:3000 myusername/my-app:1.0
```

---

## Workflow Summary

```
Write Dockerfile → docker build → docker run (test) → docker push → docker pull (deploy)
```

For multi-service applications, **Docker Compose** replaces the manual `docker run` step with a declarative `docker compose up` command (see the multi-container configuration answer for details).
