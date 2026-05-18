# Model Answers: Containerization

---

**Q: What is a container? What problem does it solve?**

> **Bottom line:** A container is an isolated, portable unit of software that packages an application with all its dependencies so it runs consistently across environments.

**Elaboration:** The classic "works on my machine" problem exists because development, CI, and production environments differ subtly in OS libraries, runtimes, and configuration. Containers eliminate that by baking the exact environment into the artifact. You ship the container image, not just the code, so what runs in CI is exactly what runs in production.

---

**Q: What is the difference between a container and a virtual machine?**

> **Bottom line:** Containers share the host OS kernel and are therefore lightweight and fast to start; VMs include a full OS and hypervisor, making them heavier but more strongly isolated.

**Elaboration:** A VM boots an entire operating system — startup takes seconds to minutes and each VM uses gigabytes of RAM. A container starts in milliseconds and uses only the memory the application needs, because it shares the host kernel. The trade-off is isolation: containers share the kernel, so a kernel exploit potentially affects all containers; VMs have a hypervisor boundary that provides stronger isolation.

---

**Q: What is the difference between a Docker image and a running container?**

> **Bottom line:** An image is an immutable, layered template; a container is a running instance of that image with an added writable layer.

**Elaboration:** Think of an image as a class and a container as an object. You can run many containers from the same image simultaneously, and each gets its own isolated writable layer for filesystem changes. When the container is removed, that writable layer disappears — data you want to persist must be in a volume.

---

**Q: What is the Open Container Initiative (OCI)?**

> **Bottom line:** The OCI is a Linux Foundation project that standardizes container image formats and runtime specifications so containers are portable across different runtimes and tools.

**Elaboration:** Before OCI, Docker's format was proprietary. OCI standardized the image spec (how layers and manifests are stored) and the runtime spec (how a container is launched). This means an image built with Docker can run with containerd, Podman, or any other OCI-compliant runtime without modification.

---

**Q: OCI vs Docker: what is a container?**

> **Bottom line:** An OCI container is the standard definition — Docker was the original implementation, but today "container" means the OCI spec, which Docker now produces and consumes.

**Elaboration:** Docker donated the core container format to OCI and now builds OCI-compliant images. Podman, containerd, and CRI-O all implement the same OCI runtime spec. In practice the distinction rarely matters for developers — the Dockerfile and `docker build` workflow produces OCI images that run anywhere.

---

**Q: What is the Docker daemon and why is it important?**

> **Bottom line:** The Docker daemon (`dockerd`) is a background service that manages all Docker objects — images, containers, volumes, and networks — and listens for API requests from the Docker CLI.

**Elaboration:** Every `docker` CLI command is an API call to the daemon. The daemon handles pulling images, creating container namespaces, managing the overlay filesystem, and networking between containers. Without the daemon running, no Docker CLI commands work.

---

**Q: What Docker CLI command builds an image from a Dockerfile?**

> **Bottom line:** `docker build -t <name>:<tag> .` — the `.` points to the build context directory containing the Dockerfile.

```bash
docker build -t myapp:1.0 .
docker build -t myapp:latest --file ./infra/Dockerfile .
```

---

**Q: How do you list running containers? All containers including stopped ones?**

> **Bottom line:** `docker ps` lists running containers; `docker ps -a` lists all including stopped ones.

```bash
docker ps          # running only
docker ps -a       # all containers
docker ps -a -q    # just IDs, useful for scripting
```

---

**Q: How do you start a container in detached mode and view its logs?**

> **Bottom line:** Run with `-d` to detach, then use `docker logs <container-id>` to tail the output.

```bash
docker run -d --name myapp myapp:latest
docker logs myapp
docker logs -f myapp   # follow (tail -f equivalent)
```

---

**Q: Write a minimal Dockerfile for a .NET 8 Web API application.**

> **Bottom line:** Use a multi-stage build — one stage to compile, one stage with just the runtime to keep the final image small.

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

---

**Q: What is a multi-stage Dockerfile build and why would you use it?**

> **Bottom line:** Multi-stage builds use multiple `FROM` statements so you can compile in a full SDK image and then copy only the output into a minimal runtime image, drastically reducing final image size.

**Elaboration:** The SDK image is ~700 MB; the ASP.NET runtime image is ~200 MB. Without multi-stage, your production image carries the full SDK including compilers, NuGet cache, and source code. Multi-stage keeps all that out of the final image, reducing attack surface and pull times.

---

**Q: What is the difference between CMD and ENTRYPOINT?**

> **Bottom line:** `ENTRYPOINT` defines the executable that always runs; `CMD` provides default arguments that can be overridden at `docker run` time.

**Elaboration:** If you set `ENTRYPOINT ["dotnet"]` and `CMD ["myapp.dll"]`, running `docker run myimage otherapp.dll` replaces the CMD arguments. If you use only `CMD ["dotnet", "myapp.dll"]`, the whole command can be replaced. For application containers, `ENTRYPOINT` is the right choice — it makes the container behavior predictable and harder to accidentally override.

---

**Q: Write a docker-compose.yml that runs a web API and a PostgreSQL database together.**

```yaml
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      ConnectionStrings__Default: "Host=db;Database=app;Username=app;Password=${DB_PASSWORD}"
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

**Q: How do you pass environment variables to a container in Compose? How do you use a .env file?**

> **Bottom line:** Use the `environment` key for static values and the `env_file` key (or a `.env` file in the project root) for secrets and per-environment configuration.

**Elaboration:** Compose automatically loads `.env` from the project directory and makes those variables available for interpolation (`${VAR_NAME}`). Never commit `.env` files containing secrets — add them to `.gitignore`. For production, use a secrets manager (Vault, AWS Secrets Manager) and inject at runtime.

---

**Q: How do you define a named volume and mount it?**

> **Bottom line:** Declare the volume under the top-level `volumes:` key and reference it in the service's `volumes:` list.

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

**Q: How do you publish a container's port to the host?**

> **Bottom line:** Use `ports: - "hostPort:containerPort"` in Compose, or `-p hostPort:containerPort` with `docker run`.

```yaml
ports:
  - "8080:80"   # host 8080 → container 80
```

---

**Q: A developer runs COPY . . in their Dockerfile and the image is 2 GB. What is wrong?**

> **Bottom line:** The build context likely includes `node_modules`, `bin`, `obj`, or other large generated directories — add a `.dockerignore` file to exclude them.

```
# .dockerignore
bin/
obj/
node_modules/
.git/
*.md
```

---

**Q: Why is it bad practice to run your application as root inside a container?**

> **Bottom line:** If an attacker escapes the container, they have root on the host — a non-root user limits the blast radius of a container breakout.

**Elaboration:** Defense in depth: containers provide namespace isolation but not a privilege boundary. Running as a non-root user means even a successful container escape grants only limited host privileges. Add a `USER` instruction in your Dockerfile and create a dedicated app user.

---

**Q: What happens to data written inside a container when it is stopped or removed?**

> **Bottom line:** Data written to the container's writable layer is lost when the container is removed — persist data in named volumes or bind mounts.

**Elaboration:** The writable layer is ephemeral by design. This is intentional — containers should be stateless. Any stateful data (database files, uploaded files) must be stored in a volume that lives outside the container lifecycle.

---

**Q: Your container can't connect to the database in the same Compose file. What are the likely causes?**

> **Bottom line:** The most common causes are: the DB container isn't ready yet when the app starts, wrong hostname (use the service name, not `localhost`), or a firewall/network issue.

**Elaboration:** Services in Compose communicate via the service name as hostname (e.g., `db`, not `localhost`). `depends_on` only waits for the container to start, not for the DB to be ready — use a healthcheck and `depends_on: condition: service_healthy` for readiness. Also verify the exposed port matches what the app connection string expects.

---

**Q: What Linux kernel features do containers rely on?**

> **Bottom line:** Namespaces provide isolation (PID, network, mount, user, IPC, UTS); cgroups limit and track resource usage (CPU, memory, I/O).

**Elaboration:** A namespace makes a process think it has its own process tree, network stack, or filesystem mount point, even though it's sharing the host kernel. Cgroups enforce that a container can't consume more than its allocated CPU or RAM, preventing one container from starving others. Together they give containers the illusion of a private OS without a separate kernel.

---

**Q: Should you run multiple processes inside a single container?**

> **Bottom line:** No — one process per container is the standard, making containers easier to scale, log, and restart independently.

**Elaboration:** When a container runs one process, its lifecycle is tied to that process — if the process dies, the container stops, and the orchestrator can restart it. Multiple processes inside one container require a process supervisor (like `s6` or `supervisord`), which adds complexity and hides individual process failures from the container runtime.

---

**Q: How do you handle secrets in a containerized environment without baking them into the image?**

> **Bottom line:** Inject secrets at runtime via environment variables from a secrets manager, Kubernetes secrets, Docker Swarm secrets, or mounted secret files — never in the Dockerfile or image.

**Elaboration:** Anything baked into an image layer is permanent and extractable with `docker history` and `docker save`. Environment variables from a `.env` file in development, and from a secrets manager (Vault, AWS SSM, Azure Key Vault) in production, keep secrets out of the image entirely. In Kubernetes, mount secrets as environment variables or files using `secretKeyRef` or `volumeMounts`.
