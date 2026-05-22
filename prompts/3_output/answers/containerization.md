# Interview Answers: Containerization

## Level 1 — Definition & Basics

### Containers vs Virtual Machines

**Q: L1 Explain the key difference between containers and virtual machines.**
> A container shares the host OS kernel; a VM emulates an entire machine including its own OS.
Containers start in milliseconds with near-zero overhead; VMs take minutes to boot and idle at gigabytes of RAM. Think of a VM as renting a whole house versus a container being a room in a building with shared plumbing.

---

**Q: L1 What are the trade-offs between VMs and containers (startup time, resource usage, security)?**
> VMs give a stronger security boundary at the cost of slower startup and heavier resource use; containers are fast and lean but share the host kernel.
A VM's hypervisor creates a hard boundary — a compromised guest can't directly attack the host kernel. Containers rely on kernel namespaces and seccomp/AppArmor, which are solid but a kernel exploit can break container isolation entirely. For startup, containers are sub-second vs. tens of seconds for VMs, which matters enormously in autoscaling scenarios. I use VMs for multi-tenant environments where untrusted code runs; containers everywhere else.

---

### Images vs Containers

**Q: L1 What's the relationship between a container image and a running container?**
> An image is a read-only blueprint; a container is the live process running from that blueprint with a writable layer on top.
Think of it as class vs. instance in OOP. Technically, an image is a stack of read-only OverlayFS layers; Docker adds a thin writable layer on top when run. Stopping preserves the writable layer; deleting removes it unless committed or using a volume.

---

**Q: L1 Can you run multiple containers from one image? What's shared vs. isolated?**
> Yes — all containers share the same read-only image layers, but each gets its own isolated writable layer, process namespace, and network namespace.
Image layers are shared and memory-mapped once across all containers, so 10 Nginx containers barely increase disk usage. Each container gets its own PID tree, network stack, writable layer, and per-container config (env vars, volumes, ports).

---

### Basic Vocabulary

**Q: L1 What does "stateless by design" mean for containers?**
> Stateless means the container holds no data that needs to survive its lifecycle — any state lives in an external store or volume.
Containers are ephemeral: the writable layer dies on deletion and orchestrators reschedule containers freely. Stateless design allows horizontal scaling, easy redeployment, and interchangeable instances — the foundation of reliable autoscaling.

---

**Q: L1 What happens when you pull an image (network and filesystem level)?**
> Docker fetches the image manifest from the registry, then downloads any missing layers as compressed tarballs and unpacks them into the local layer cache.
The manifest is a JSON listing each layer by SHA256 digest; Docker checks which layers exist locally and downloads only the delta. Each layer is verified against its digest and extracted to `/var/lib/docker/overlay2`. Subsequent pulls are near-instant because layers are cached.

---

### What is a Container?

**Q: L1 What is a container in simple terms?**
> A container is a lightweight, isolated package containing your application and everything it needs to run — code, runtime, dependencies, configuration.
Think of it like a shipping container: just as a shipping container standardizes how goods are transported regardless of what's inside, a Docker container standardizes how applications run. The container is isolated from the host machine and other containers, but it shares the host OS kernel (unlike a VM which has its own OS). When you run a container, it's a live, running instance of an image — the image is the blueprint, the container is the running process.

```bash
# Create and run a simple container
docker run -d --name myapp nginx:latest

# The container is now running — a live process on your machine
docker ps  # Shows running containers
```

---

### Volumes & Persistent Storage

**Q: L1 What are volumes and why do you need them?**
> Volumes are Docker's way of managing persistent data — data that needs to survive when a container stops or is deleted.
Containers are ephemeral: when you delete a container, any data written inside it is lost forever. If your application needs to persist data (database files, user uploads, logs), it must be stored in a volume, not in the container's filesystem. Volumes live outside the container and can be backed up, shared between containers, or mounted from the host. Without volumes, restarting your database container would lose all its data.

```bash
# Run a database with a named volume (data survives container deletion)
docker run -d \
  --name postgres \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# pgdata volume survives: docker rm postgres (data still there)
docker volume ls
docker volume inspect pgdata
```

---

### Ports & Exposing Services

**Q: L1 What does it mean to "expose a port" and how does port mapping work?**
> Exposing a port means making a service running inside the container accessible from outside the container — either from the host machine or over the network.
A container runs in isolation; by default, nothing outside can reach services inside it. If your container runs a web server on port 80, you can't access it from your browser without explicitly mapping it. The `-p` flag maps a port on the host to a port inside the container: `-p 8080:80` means "forward traffic arriving at the host's port 8080 to the container's port 80."

```bash
# Run nginx inside a container, accessible on host port 8080
docker run -d -p 8080:80 nginx

# Now you can access it: curl http://localhost:8080
# Port 8080 (host) → Port 80 (inside container)

# Map multiple ports
docker run -d \
  -p 8080:80 \
  -p 8443:443 \
  nginx
```

---

### Base Images & Dockerfile

**Q: L1 What is a base image and why does every Dockerfile start with FROM?**
> A base image is the starting point for your container — it contains a pre-built environment (OS, runtime, tools) that your application builds on top of.
`FROM ubuntu:22.04` means "start with Ubuntu 22.04 as my foundation." Instead of building everything from scratch, you inherit everything Ubuntu provides: the Linux kernel libraries, package manager, shell, etc. Common base images include `python:3.11` (has Python pre-installed), `node:20` (has Node.js), `alpine:latest` (tiny Linux), or `scratch` (completely empty, for static binaries).

```dockerfile
# Start with a base image
FROM node:20-alpine

# Everything you do after this builds on top of Node.js
WORKDIR /app
COPY package.json .
RUN npm install
COPY src .
CMD ["npm", "start"]
```

---

### Environment Variables

**Q: L1 What are environment variables and why pass them to containers?**
> Environment variables are key-value pairs that your application reads at runtime — used for configuration that might change between environments (dev, staging, production).
Instead of baking configuration into your code or image, you pass it to the container at runtime. For example, `DB_HOST` might be `localhost` in development but `postgres.example.com` in production — same container image, different environment variables. This makes containers portable and flexible.

```bash
# Pass environment variables when running a container
docker run -d \
  -e DB_HOST=postgres.example.com \
  -e DB_USER=admin \
  -e DEBUG=true \
  myapp:latest

# Inside the container, your app reads these:
# process.env.DB_HOST → "postgres.example.com"

# Or use a file
docker run -d --env-file .env myapp:latest
```

---

### Container Networking Basics

**Q: L1 How do containers talk to each other and to the outside world?**
> Containers can communicate with the host, with other containers on the same network, and with the outside world — but they need to be explicitly connected.
By default, containers are isolated. To let two containers talk to each other, they must be on the same Docker network. Containers can reach the host via `host.docker.internal`. Outbound traffic from a container reaches the outside world automatically (your app can make HTTP requests to external APIs).

```bash
# Create a network so containers can talk
docker network create mynet

# Run two containers on the same network
docker run -d --name db --network mynet postgres:16
docker run -d --name app --network mynet -e DB_HOST=db myapp:latest

# Inside the app container, DB_HOST=db automatically resolves to the postgres container's IP
# Without the network, the app couldn't find the database

# Containers can reach outside world automatically
docker run --rm alpine wget https://google.com  # Works!
```

---

### Docker Compose Basics

**Q: L1 What is Docker Compose and why use it?**
> Docker Compose lets you define and run multiple containers as a single application using a YAML file — instead of running `docker run` commands for each container separately.
Compose solves the "how do I run my multi-container app?" problem. Instead of manually creating networks, running containers with environment variables, managing volumes, and linking them together, you define everything in `docker-compose.yml` and run `docker-compose up`. It's perfect for development (spin up a database + app with one command) and for simple production deployments. Compose automatically creates a network so all services can talk by name, handles volume creation, environment variables, and startup order.

```yaml
# Simple docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  app:
    build: .  # Build from Dockerfile in current directory
    ports:
      - "8080:3000"  # Host port 8080 → Container port 3000
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/myapp
    depends_on:
      - db

volumes:
  pgdata:
```

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View running services
docker-compose ps

# View logs
docker-compose logs -f app

# Stop all services (keeps volumes)
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Run a one-off command
docker-compose exec app npm run migrate
```

---

**Q: L1 How do services in Compose communicate with each other?**
> Compose automatically creates a network and adds all services to it; services can reach each other by service name (hostname).
In the example above, the `app` service can connect to the `db` service using the hostname `db` — you don't need to hardcode IPs or manually create a network. Compose sets `DB_HOST=db` and the app's database driver connects to `db:5432`, which resolves automatically. This is why the `DATABASE_URL` in the example works: `db` is the service name, and Compose's embedded DNS server handles the resolution.

```bash
# Inside the app container, you can reach the database:
docker-compose exec app psql -h db -U postgres -d myapp

# Works because Compose created a network and added both services to it
```

---

**Q: L1 What's the difference between `docker-compose up` and `docker run`?**
> `docker run` starts a single container; `docker-compose up` starts all services defined in `docker-compose.yml`, networking them together, with one command.
With `docker run`, you manually link containers, create networks, and pass environment variables. With Compose, it's all in the YAML file. `docker-compose up` creates the network, starts services in dependency order, mounts volumes, sets environment variables — everything you'd do manually with multiple `docker run` commands. For multi-container apps, Compose saves you from repeating the same setup over and over.

```bash
# Without Compose (multiple manual steps)
docker network create myapp-net
docker volume create pgdata
docker run -d --name db --network myapp-net -v pgdata:/data postgres:16
docker run -d --name app --network myapp-net -p 8080:3000 myapp:latest

# With Compose (one command)
docker-compose up
```

---

## Level 2 — Core Concepts

### Daemon Service

**Q: L2 What is the Docker daemon and why is it necessary?**
> `dockerd` is the privileged background process that manages the full container lifecycle — images, networking, volumes, and spawning containers via containerd.
Containers require ongoing kernel-level operations that need a privileged authority: maintaining namespaces, enforcing cgroup limits, handling network plumbing. The CLI is just a REST client talking to the daemon's Unix socket.

---

**Q: L2 What are the security implications of a privileged Docker daemon?**
> Anything that can talk to the Docker socket has root-equivalent access on the host, which is a significant attack surface.
The Docker socket at `/var/run/docker.sock` is essentially a root backdoor — mounting it into a container, for example in a CI runner, means that container can launch privileged containers, mount the host filesystem, and escape isolation entirely. The trade-off is real: the daemon model is convenient because it centralizes state, but it means a compromised build step can own your host. Rootless Docker and Podman's daemonless model exist specifically to address this.

---

### Open Container Initiative (OCI)

**Q: L2 What problem does OCI solve?**
> OCI standardized the container image and runtime formats so that images and runtimes from different vendors are interoperable.
Before OCI, Docker's formats were proprietary. OCI specs allow any runtime to implement them. An image built with Buildkit runs identically on containerd, podman, or any OCI-compliant runtime — your CI pipeline isn't locked to Docker the product.

---

**Q: L2 What's the difference between Docker and OCI?**
> Docker is a product that popularized containers; OCI is the open standard that defines what a container actually is, so it can outlive any single vendor.
Docker gave us the UX (CLI, registry model, Dockerfile). The underlying technology is now standardized by OCI, so you can build with Buildah, push to ECR, and run with containerd without touching Docker. Docker popularized containers; OCI standardized them.

---

### Container Lifecycle

**Q: L2 What states can a container be in and what triggers transitions between them?**
> Created → Running → Paused/Stopped/Exited → Removed, with each transition triggered by explicit commands or process exit.
`docker run` creates and starts the container. It's `running` while its main process is alive. `docker pause` freezes it with SIGSTOP; `docker stop` sends SIGTERM then SIGKILL, leaving it `exited` with the writable layer intact. `docker rm` deletes it permanently. Exited containers' logs remain inspectable until removal.

---

**Q: L2 What happens to container data when stopped vs. removed?**
> Stopping preserves the writable layer; removing deletes it permanently.
Stopping pauses the container in place; the writable layer survives and restart preserves data. `docker rm` deletes the writable layer and all container filesystem data. If data must survive `docker rm`, it must be in a named volume or bind mount.

---

## Level 3 — Practical Usage

### CLI — Containers

**Q: L3 How do you diagnose and force-remove an unresponsive container?**
> Inspect, logs, exec, kill, force-remove — in that order.
I start with `docker ps -a` to see state, then `docker logs <id>` for output. If the process is alive but hung, `docker exec <id> sh` to get a shell — though this fails on distroless. `docker stats <id>` shows if it's CPU/memory stuck. If I need to kill it, `docker stop <id>` first (SIGTERM), then `docker kill <id>` (SIGKILL), and finally `docker rm -f <id>` to force-remove even if running.

```bash
# Step 1: Check state
docker ps -a | grep <name>

# Step 2: Inspect running state
docker inspect <id> | grep -E '"State"|"Status"'
# "State": {"Status": "running", "Pid": 12345}

# Step 3: Check logs for errors
docker logs --tail 100 <id>
docker logs --follow <id>  # stream logs

# Step 4: Get a shell (fails on distroless)
docker exec -it <id> sh
# Can't reach shell? Check if process is stuck:
docker stats <id>  # CPU/memory usage?

# Step 5: Graceful shutdown (SIGTERM, 10s grace period)
docker stop <id>

# Step 6: If still running, force kill (SIGKILL)
docker kill <id>

# Step 7: Remove container completely
docker rm <id>

# Nuclear option: remove running container immediately
docker rm -f <id>

# Cleanup all stopped containers
docker container prune
```

---

### CLI — Volumes

**Q: L3 What's the difference between bind mounts and named volumes?**
> Bind mounts map a specific host path into a container; named volumes are managed by Docker and are portable, performance-optimized, and preferred for production data.
Bind mounts are ideal for development because you see code changes instantly without rebuilding — mount your source directory and the container sees live edits. Named volumes are better for databases and persistent data because Docker manages their location, they work consistently across OSes, and backup/restore is straightforward with `docker volume` commands. I never use bind mounts for database data directories in any environment beyond local dev.

```bash
# Bind mount for development (live code changes)
docker run -v $(pwd)/src:/app/src myapp

# Named volume for production data (database)
docker volume create pgdata
docker run -v pgdata:/var/lib/postgresql/data postgres:16

# Backup and restore named volume
docker run --rm -v pgdata:/data -v $(pwd):/backup \
  busybox tar czf /backup/pgdata-backup.tar.gz /data

docker run --rm -v pgdata:/data -v $(pwd):/backup \
  busybox tar xzf /backup/pgdata-backup.tar.gz -C /

# Inspect volume location
docker volume inspect pgdata | grep Mountpoint
```

---

**Q: L3 How do you persist database data across container restarts?**
> Use `-v pgdata:/var/lib/postgresql/data` with a named volume.
The `-v` flag mounts storage into the container. Using a named volume instead of a host path means Docker controls the underlying location, handles permissions correctly, and the volume persists across `docker stop`/`start` and even `docker rm` — it only disappears with `docker volume rm`. For databases specifically I always name the volume explicitly so it's easy to find and back up.

```bash
docker run -d \
  --name postgres \
  -v pgdata:/var/lib/postgresql/data \   # named volume: persists across restarts and rm
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:16
```

---

### CLI — Networks

**Q: L3 What Docker networking modes exist and when is the default bridge insufficient?**
> Bridge is the default for single-host isolation; host gives native network performance; none removes networking; overlay spans multiple hosts — default bridge lacks automatic DNS resolution between containers.
User-defined bridge networks add built-in DNS (why Compose always creates one). Host mode is useful for high-throughput services where NAT overhead matters. Overlay networks enable containers across multiple hosts.

---

**Q: L3 How does DNS resolution work between containers on a user-defined bridge network?**
> Docker runs an embedded DNS server at 127.0.0.11 on user-defined networks; containers resolve each other by container name or Compose service name automatically.
Docker configures each container's `/etc/resolv.conf` to point to `127.0.0.11`, which answers queries for container names against the network's internal records. This is why `web` can connect to `db:5432` directly in a Compose file. The default bridge network lacks this resolver.

```bash
# Default bridge network (no DNS between containers)
docker run --name db postgres:16
docker run -e DB_HOST=db myapp  # ❌ Fails: 'db' not resolvable

# User-defined bridge network (DNS works)
docker network create mynet
docker run --network mynet --name db postgres:16
docker run --network mynet -e DB_HOST=db myapp  # ✓ Works!

# Verify DNS resolution inside container
docker run --network mynet --rm busybox nslookup db
# Server: 127.0.0.11:53
# Address: db (172.18.0.2)
```

```yaml
# Docker Compose always creates user-defined network (DNS works by default)
services:
  db:
    image: postgres:16
  app:
    image: myapp:latest
    environment:
      DB_HOST: db  # DNS automatically resolves to postgres service
```

---

### Configuration Files

**Q: L3 Write a production-ready Dockerfile for a Node.js app.**
> Use multi-stage builds, non-root user, pinned base image, and copy only what's needed.

```dockerfile
# Stage 1: install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: production image
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root user for least privilege
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

EXPOSE 3000
CMD ["node", "src/index.js"]
```

Alpine keeps the image small. Multi-stage means build tools and npm cache never appear in the final image. `npm ci --omit=dev` installs only production dependencies. I deliberately don't use `COPY . .` to avoid copying `.env` files, `.git`, or local configs — `.dockerignore` should back this up. `EXPOSE` is documentation only; `-p` at runtime does the actual port binding. I omit `HEALTHCHECK` here but would add it in a real deployment.

---

**Q: L3 What's the difference between CMD and ENTRYPOINT?**
> `ENTRYPOINT` sets the fixed executable; `CMD` provides default arguments that are overridable — combining them lets you create a container that behaves like a CLI tool.
With only `CMD`, you can override the entire command at `docker run`. With `ENTRYPOINT`, the entrypoint always runs and any `docker run` arguments are appended to it. When both are set, `CMD` becomes the default arguments to the `ENTRYPOINT`. A perfect use case is a database backup tool: `ENTRYPOINT ["pg_dump"]` and `CMD ["--help"]` means `docker run myimage mydb` runs `pg_dump mydb`, while `docker run myimage` shows help.

---

### Remote Registries

**Q: L3 How do you use images from a private registry in your Dockerfile and CI?**
> Update `FROM` to the full registry URL, and ensure CI authenticates to that registry before building or pulling.
In the Dockerfile, `FROM registry.company.com/base/node:20` replaces `FROM node:20`. In CI, you need a `docker login registry.company.com` step using credentials stored as CI secrets, or use a credential helper (ECR's `aws ecr get-login-password`, for example). If using Kubernetes, configure `imagePullSecrets`. I'd also consider pinning by digest in the `FROM` line to avoid silent base image updates.

---

**Q: L3 Why is pinning by digest safer than pinning by tag?**
> Tags are mutable pointers that can be reassigned; a digest is a cryptographic hash of the exact image content and cannot change.
`latest` is obviously dangerous — it moves with every push. But even `postgres:16.3` is mutable: the maintainer can push a patched image under the same tag and your `FROM postgres:16.3` will silently get different bytes on the next build. A digest like `postgres@sha256:abc123` is computed from the manifest content — if any layer changes, the digest changes, so you're guaranteed reproducibility. I use tags for human readability in dev and digest-pinned references in production CI.

---

### Ports and Environment

**Q: L3 What's the difference between EXPOSE and -p flag?**
> `EXPOSE` is documentation; `-p` is what actually configures the host port mapping via iptables.
`EXPOSE 8080` in a Dockerfile tells readers and tooling what port the app listens on — it doesn't open anything. `docker run -p 8080:80` creates a real iptables DNAT rule that forwards host port 8080 to the container's port 80. You can omit `EXPOSE` entirely and `-p` still works. The one scenario where `EXPOSE` matters mechanically is `docker run -P` (uppercase), which auto-maps all exposed ports to ephemeral host ports.

---

**Q: L3 How do you pass environment variables to a container (--env, --env-file, baked)?**
> `--env` for single values, `--env-file` for a batch of non-secret config, and never bake secrets into the image.
`--env KEY=value` sets individual variables; `--env-file .env` reads a file of `KEY=value` pairs. Both are visible in `docker inspect` and process listings, which is fine for non-sensitive config but wrong for secrets. Baking secrets into the image via `ENV PASSWORD=secret` in a Dockerfile is worst-case — they're visible in every layer and to anyone who pulls the image. For secrets, use Docker secrets, Compose secrets, or an external vault and inject at runtime through a proper secrets manager.

---

## Level 4 — Common Pitfalls

### Dockerfile Pitfalls

**Q: L4 Why is Docker build slow when only source files change?**
> Cache is invalidated early — typically by `COPY . .` before `RUN npm install`, so any file change busts the cache for the expensive install step.
Fix: copy only dependency manifests first, then install, then copy source code. With BuildKit you can also use cache mounts (`--mount=type=cache`) to persist package manager caches across builds.

```dockerfile
# Wrong — busts cache on any source change
COPY . .
RUN npm ci

# Right — cache is only busted when package.json changes
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
```

---

**Q: L4 What are the risks of using ADD instead of COPY?**
> `ADD` has hidden behaviors — URL fetching and auto-extraction of tarballs — that make builds unpredictable; `COPY` is explicit and preferred.
`ADD` can fetch from URLs without digest verification (supply chain risk) and automatically extracts tarballs. The only legitimate use is extracting local tarballs; use `COPY` for everything else.

---

**Q: L4 Why shouldn't containers run as root?**
> Root inside a container has uid 0 and kernel vulnerabilities can allow breakouts from root processes; namespaces reduce but don't eliminate the risk.
Fix: use a single `USER` instruction. If the app needs to bind ports below 1024, use `CAP_NET_BIND_SERVICE` explicitly rather than running as root.

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

---

### Compose Pitfalls

**Q: L4 Why doesn't depends_on wait for the database to be ready?**
> `depends_on` only waits for the container to start, not for the service inside it to be ready — you need a health check or a retry loop in your app.
Docker Compose considers the dependency satisfied once the container is in the `running` state, which happens before PostgreSQL finishes initializing and starts accepting connections. The clean solutions are: add a `healthcheck` to the DB service and use `depends_on: condition: service_healthy` in Compose v3.9+; or implement retry logic with backoff in the application itself (which you should have anyway for production resilience). Tools like `wait-for-it.sh` work but are a workaround for an application that should handle transient connection failures.

```yaml
# docker-compose.yml with health checks
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy  # Wait for health check, not just running
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/myapp
```

---

**Q: L4 What are the risks of storing secrets in .env files?**
> `.env` files are too easily committed to version control or exposed on disk — use Docker/Compose secrets or an external secrets manager for anything sensitive.
The risk is straightforward: `.env` files in project directories get committed accidentally, shared over Slack, or left on developer machines and CI agents. Even if `.gitignore`d, they're plaintext on disk. Compose secrets (`secrets:` top-level key with `file:` source) are slightly better — they're mounted as tmpfs files in the container. For production, the right answer is an external secrets manager like Vault or AWS Secrets Manager, where secrets are fetched at runtime and never touch the filesystem as plaintext.

```yaml
# docker-compose.yml using Compose secrets (better than .env)
services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
    environment:
      # Secrets are mounted at /run/secrets/db_password, etc.
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
secrets:
  db_password:
    file: ./secrets/db_password.txt  # .gitignore this!
  api_key:
    file: ./secrets/api_key.txt
```

```bash
# Production: fetch secrets from external manager at runtime
docker run -e AWS_REGION=us-east-1 \
  -v ~/.aws/credentials:/home/app/.aws/credentials:ro \
  myapp:latest

# Inside app, fetch at startup:
# 1. AWS Secrets Manager: aws secretsmanager get-secret-value
# 2. HashiCorp Vault: vault kv get secret/myapp
# 3. Never bake secrets into image
```

---

### Volume and State Pitfalls

**Q: L4 What are the issues with bind-mounting the entire project root?**
> Full project root mounts expose sensitive files (credentials, .git history) to the container and cause severe I/O performance degradation on macOS due to osxfs/VirtioFS overhead.
On macOS, a full `node_modules` mount can make builds 10x slower. Security-wise, mounting the root exposes `.env` files, SSH keys, and `.git` history. Mount only what the container needs and use named volumes for dependencies.

---

**Q: L4 Why does database data disappear after docker-compose down?**
> `docker-compose down` removes anonymous volumes by default but preserves named volumes — unless `-v` is passed.
Anonymous volumes (from the image's `VOLUME` directive) are deleted; named volumes survive `down`. Always use explicitly named volumes in `compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

---

## Level 5 — Internals & Deep Mechanics

### Kernel Primitives

**Q: L5 What Linux kernel features enable container isolation (namespaces and cgroups)?**
> Namespaces provide isolation of kernel resources so processes can't see each other; cgroups limit how much of those resources a process group can consume.
Namespaces virtualize kernel resources — a process in its own PID namespace sees a private tree starting at 1, its own network interfaces and mount table. Cgroups enforce limits on CPU, memory, I/O, and network bandwidth, triggering the OOM killer when breached. Together they create an isolated machine illusion without virtualization hardware.

---

**Q: L5 Which namespaces do containers use and what's not isolated?**
> A typical container uses PID, net, mnt, uts, ipc, and user namespaces — but the host kernel, hardware, and system time are shared.
PID gives its own process tree; net gives virtual network interfaces; mnt provides isolated mount table; UTS gives its own hostname; IPC isolates shared memory. User namespaces (optional) remap UIDs. Not isolated: the kernel itself, hardware clocks, and kernel's attack surface — kernel vulnerabilities are exploitable from any container.

```bash
# List namespaces used by a container process
ls -l /proc/$(docker inspect -f '{{.State.Pid}}' <container-id>)/ns/

# Expected output:
# ipc, mnt, net, pid, uts, user (linked to container's namespace)
# cgroup (may be shared with host depending on cgroup version)
```

---

**Q: L5 How do cgroups enforce resource limits and trigger the OOM killer?**
> Cgroups enforce limits at the kernel level; when a container exceeds its memory limit, the kernel OOM killer terminates processes — potentially including processes in other containers or on the host.
The kernel first tries page cache eviction. If that fails, the OOM killer scores and kills processes — which may spill to the host if the cgroup limit isn't set. Without a `--memory` limit, a container can exhaust host RAM freely, which is why every production container should have explicit resource limits.

---

### Image Layering

**Q: L5 Why does each RUN instruction create a layer? How does this affect image size and cache?**
> Each `RUN` snapshots the filesystem delta as a new immutable layer, so files deleted in later instructions are still stored in earlier layers, and any change invalidates all subsequent layers.
If you install a package in one `RUN` and delete it in the next, the deleted files still exist in the first layer — the image isn't smaller. Cleanup must happen in the same `RUN` as the install. Layers are cached by instruction hash; changing one `RUN` invalidates it and all layers after it, so instruction ordering matters for build performance.

---

---

## Level 6 — Trade-offs & Design Decisions

### Image Design

**Q: L6 What techniques minimize attack surface in container images?**
> Layer your approach: multi-stage builds first, then Alpine or distroless for the runtime, and scratch only for statically compiled binaries.
Multi-stage builds are the biggest win — separate build and runtime stages so compilers and build tools never appear in the final image. Alpine images are ~5MB and include a shell and package manager, which helps with debugging but means more attack surface than distroless. Google's distroless images include only the language runtime and CA certs — no shell, no package manager, excellent security posture but harder to debug. `scratch` is for Go or Rust binaries that statically link everything; the image is literally just your binary. I use distroless for JVM and Node.js services and scratch for compiled Go services.

```bash
# Scan image for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image myapp:latest

# Use Grype for detailed CVE info
grype myapp:latest --output table

# Continuous scanning in registry
trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:latest || echo "CVEs found"

# Check image layers and size
docker history myapp:latest
# Alpine: ~5MB | distroless: ~20MB | scratch: just binary
```

---

**Q: L6 Should dependencies be baked into images or mounted at runtime?**
> Bake them into the image for production — it guarantees reproducibility and immutability; mount at runtime only for local development speed.
Baking in guarantees identical behavior everywhere and allows CI to verify the exact dependency set. Mounting at runtime is faster for local iteration but breaks reproducibility and makes scanning meaningless. Development can mount; CI and production always bake.

---

### Orchestration Scope

**Q: L6 When should you move from Compose to Kubernetes?**
> You outgrow Compose when you need multi-host deployments, fine-grained autoscaling, rolling updates without downtime, or production-grade self-healing.
Compose runs on a single machine; Kubernetes adds multi-host orchestration at significant operational cost: steep learning curve, complex YAML, a control plane to manage. Migration requires rewriting manifests, adapting storage assumptions, and team training. Managed Kubernetes (EKS, GKE) removes control plane work but adds vendor coupling.

---

**Q: L6 Containerized vs. managed stateful services (e.g., Redis) — trade-offs?**
> Self-managed containerized Redis gives control and cost savings; a managed service like ElastiCache gives operational simplicity, automatic failover, and compliance at a higher cost.
Containerized: cheaper, fully controllable, reproducible locally, no vendor lock-in. You own backups, failover, upgrades, and monitoring — one misconfiguration and data is gone. Managed: HA, automated failover, encryption at rest, patching, metrics, audit trails. Use managed for anything where data loss has business consequences; containerize for dev/staging and cache-only workloads.

---

### Secret Management

**Q: L6 Compare approaches to managing secrets: env vars, .env files, Docker secrets, external managers.**
> Use environment variables for local dev, `.env` files for team dev convenience, Docker secrets for Swarm/Compose production, and an external secrets manager for anything in a real production environment.
Environment variables are visible in `docker inspect` and process listings — local dev only. `.env` files are plaintext on disk and easily committed. Docker/Compose secrets mount as tmpfs, never in layers — good for self-hosted production. External managers (Vault, AWS Secrets Manager) provide audit logging, rotation, and no plaintext on disk — mandatory for regulated environments.

---

### Registry Strategy

**Q: L6 Docker Hub vs. self-hosted vs. cloud registries — which to choose?**
> Use the cloud-provider registry if you're already on that cloud; Harbor if you need self-hosted control; Docker Hub only for public images or small teams without compliance requirements.
ECR/GCR integrate natively with IAM and Kubernetes node identity with built-in vulnerability scanning. Harbor gives full control for data sovereignty and air-gap requirements but you own HA, storage, and upgrades. Docker Hub has rate limits on free tier and weaker security for private images. Cloud-provider registries win on cost, latency, and integration when compute is in the same region.

---
