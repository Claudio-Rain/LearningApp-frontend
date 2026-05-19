# Interview Questions: Containerization

## Coverage map

| Item | Type | Level |
|------|------|-------|
| Difference between containers and VMs | `[FROM JD]` | 1–2 |
| Difference between images and containers | `[FROM JD]` | 1–2 |
| What is a daemon service and why it matters | `[FROM JD]` | 2 |
| What is OCI (Open Container Initiative) | `[FROM JD]` | 2–5 |
| OCI vs Docker: what is a container | `[FROM JD]` | 2–5 |
| CLI usage: images, containers, volumes, networks | `[FROM JD]` | 3 |
| Creating configuration files (Dockerfile / Compose) | `[FROM JD]` | 3–4 |
| Cross-container configuration (multi-service setups) | `[FROM JD]` | 3–4 |
| Using predefined images from remote registries | `[FROM JD]` | 3 |
| Shared volumes, .env files, published ports | `[FROM JD]` | 3–4 |
| Container lifecycle and state management | `[INFERRED]` | 2–4 |
| Image layering and build cache | `[INFERRED]` | 4–5 |
| Networking modes and DNS resolution | `[INFERRED]` | 4–5 |
| Security: least-privilege, secrets, surface area | `[INFERRED]` | 5–6 |
| Container runtimes (runc, containerd, cri-o) | `[INFERRED]` | 5 |
| Namespaces and cgroups as the kernel primitives | `[INFERRED]` | 5 |
| Orchestration trade-offs (Compose vs K8s) | `[INFERRED]` | 6–7 |
| Image size and supply-chain trade-offs | `[INFERRED]` | 6–7 |
| Debugging running containers | `[INFERRED]` | 4–6 |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate has accurate mental models of what containers and images are before going deeper._

### Containers vs Virtual Machines
- ❓ How would you explain the difference between a container and a virtual machine to a colleague who has used VMs but never containers? `[FROM JD]`
- ❓ Both VMs and containers provide isolation — what are the trade-offs of each approach in terms of startup time, resource usage, and security boundary? `[FROM JD]`

### Images vs Containers
- ❓ What is the relationship between a container image and a running container? Use an analogy if it helps. `[FROM JD]`
- ❓ If I have one image, can I run multiple containers from it simultaneously? What would be shared and what would be isolated? `[FROM JD]`

### Basic Vocabulary
- ❓ What does it mean for a container to be "stateless by design," and why do people say that? `[INFERRED]`
- ❓ When someone says "pull an image," what is actually happening at the network and filesystem level in simple terms? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Validate understanding of fundamental mechanisms — daemon, OCI, lifecycle — before asking for hands-on CLI work._

### Daemon Service
- ❓ What is the Docker daemon (`dockerd`) and why does containerization depend on a long-running background service? `[FROM JD]`
- ❓ What are the security implications of running a privileged daemon that owns the container lifecycle? Is there a trade-off between convenience and security here? `[FROM JD]`

### Open Container Initiative (OCI)
- ❓ What problem was OCI created to solve, and why does it matter for teams that run containers in production? `[FROM JD]`
- ❓ OCI defines two specifications: the Image Spec and the Runtime Spec. What does each one govern, and how do they relate to Docker's own formats? `[FROM JD]`
- ❓ How would you explain the difference between Docker as a product and OCI as a standard when someone asks "what is a container"? `[FROM JD]`

### Container Lifecycle
- ❓ Walk me through the states a container can be in from `docker run` to `docker rm`. What triggers each transition? `[INFERRED]`
- ❓ What happens to data written inside a container's writable layer when the container is stopped versus when it is removed? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Confirm the candidate can actually build and operate containerized workloads day-to-day._

### CLI — Images
- ❓ You need to pull a specific version of a PostgreSQL image from Docker Hub and verify its digest before using it in CI. Walk me through the commands. `[FROM JD]`
- ❓ After several weeks of development your local image cache is several gigabytes. How do you inspect and clean it up without accidentally removing images still in use? `[FROM JD]`

### CLI — Containers
- ❓ A container you started in detached mode seems unresponsive. What sequence of CLI commands do you use to diagnose and, if necessary, force-remove it? `[FROM JD]` `[INFERRED — debugging scenario]`
- ❓ How do you exec into a running container, and what are the limitations of that approach for a container built on a distroless image? `[FROM JD]`

### CLI — Volumes
- ❓ What is the difference between a bind mount and a named volume, and when would you choose each? `[FROM JD]`
- ❓ You want to persist a database's data directory across container restarts without committing it to the image. Show the exact `docker run` flags and explain what each flag does. `[FROM JD]`

### CLI — Networks
- ❓ What networking modes does Docker support (bridge, host, none, overlay)? When is the default bridge network insufficient? `[FROM JD]`
- ❓ Two containers on the same user-defined bridge network need to communicate by hostname. How does Docker DNS resolution work in that context? `[INFERRED]`

### Configuration Files
- ❓ Write a minimal but production-aware Dockerfile for a Node.js application. Explain every instruction you include and any you deliberately omit. `[FROM JD]`
- ❓ What is the difference between `CMD` and `ENTRYPOINT`, and what happens when both are specified? Give a scenario where combining them is the right design. `[FROM JD]`

### Remote Registries
- ❓ Your team wants to use a curated base image from a private registry instead of Docker Hub. What changes in your Dockerfile and your CI pipeline? `[FROM JD]`
- ❓ What is an image tag, and why is pinning to a digest safer than pinning to a tag like `latest` or even `1.2.3`? `[FROM JD]`

### Ports and Environment
- ❓ Explain the difference between `EXPOSE` in a Dockerfile and `-p` / `--publish` in `docker run`. Which one actually makes a port reachable from the host? `[FROM JD]`
- ❓ How do you pass environment variables into a container at runtime, and what is the difference between using `--env`, `--env-file`, and baking values into the image? `[FROM JD]`

---

## Level 4 — Common Pitfalls
_Goal: Surface real-world mistakes candidates have made or know how to avoid._

### Dockerfile Pitfalls
- ❓ A colleague's Docker build takes 8 minutes even when only a single source file changed. What is most likely wrong, and how do you fix it? `[INFERRED — debugging scenario]`
- ❓ What are the risks of using `ADD` instead of `COPY` in a Dockerfile? When is `ADD` actually appropriate? `[INFERRED]`
- ❓ Why is running processes as root inside a container considered a bad practice, and how do you change that in a Dockerfile? `[INFERRED]`

### Compose Pitfalls
- ❓ You have a `docker-compose.yml` with a web service that `depends_on` a database service, but the app still crashes on startup because the DB isn't ready. Why doesn't `depends_on` solve this, and what are your options? `[FROM JD]` `[INFERRED — debugging scenario]`
- ❓ You're storing secrets (API keys, DB passwords) in a `.env` file referenced by Compose. What are the risks, and what is the better approach? `[FROM JD]`

### Volume and State Pitfalls
- ❓ A developer commits a `docker-compose.yml` that bind-mounts the entire project root into the container. What performance and security problems can this cause? `[FROM JD]`
- ❓ After a `docker-compose down`, a teammate reports that all database data is gone. What most likely happened, and how do you prevent it? `[INFERRED — debugging scenario]`

### Cross-Container Configuration
- ❓ Two services in the same Compose file need to share a configuration file without duplicating it. What mechanisms does Compose provide, and what are the trade-offs of each? `[FROM JD]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Distinguish senior from mid-level candidates by probing kernel primitives and runtime architecture._

### Kernel Primitives
- ❓ Docker containers are often described as "processes with extra isolation." What Linux kernel features — specifically namespaces and cgroups — make that isolation possible? `[INFERRED]`
- ❓ Which namespaces does a typical container use, and what does each one isolate? What is deliberately *not* isolated? `[INFERRED]`
- ❓ How do cgroups limit resource consumption, and why does a container that ignores memory limits eventually cause the OOM killer to trigger on the host? `[INFERRED]`

### Image Layering
- ❓ How does the union filesystem (e.g., OverlayFS) work to compose read-only image layers with a writable container layer? What are the performance implications for write-heavy workloads? `[INFERRED]`
- ❓ Why does every `RUN` instruction in a Dockerfile create a new layer, and how does this affect both image size and build cache invalidation? `[INFERRED]`

### OCI Runtime
- ❓ What is `runc`, and how does it relate to `containerd` and `dockerd`? Trace the call chain from `docker run` to a process appearing in `ps`. `[FROM JD]` `[INFERRED]`
- ❓ What is the OCI Runtime Specification's `config.json`? Where does it live and what does it contain? `[FROM JD]`
- ❓ Alternative runtimes like gVisor (runsc) and Kata Containers exist alongside runc. What problem do they solve and what do they trade away? `[INFERRED]`

### Networking Internals
- ❓ How does Docker implement the default bridge network using virtual ethernet pairs (veth) and iptables rules? `[INFERRED]`
- ❓ When you publish a port with `-p 8080:80`, what exactly does Docker configure at the network level to forward traffic? `[FROM JD]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural judgment, not just knowledge._

### Image Design
- ❓ Your security team mandates minimal attack surface: every image must be as small as possible. Walk me through the techniques you would use (multi-stage builds, distroless, Alpine, scratch) and the trade-offs of each. `[INFERRED]`
- ❓ Should application dependencies (e.g., `node_modules`, pip packages) be baked into the image or mounted in at runtime? Argue both sides. `[FROM JD]`
- ❓ When is it appropriate to put multiple processes inside a single container versus splitting them into separate containers? What signals guide that decision? `[INFERRED]`

### Orchestration Scope
- ❓ Docker Compose is great for local dev. At what point does a team outgrow Compose and need Kubernetes, and what are the migration costs? `[INFERRED]`
- ❓ Your team runs a stateful service (e.g., Redis) in a container. What are the trade-offs of containerizing it versus using a managed cloud service? `[INFERRED]`

### Secret Management
- ❓ Compare these four approaches to getting a DB password into a running container: environment variable, `.env` file, Docker/Compose secret, external secrets manager (Vault, AWS Secrets Manager). When would you use each? `[FROM JD]`

### Registry Strategy
- ❓ Your company is deciding between Docker Hub, a self-hosted registry (Harbor), and a cloud-provider registry (ECR, GCR). What factors drive that decision? `[FROM JD]`

---

## Level 7 — Advanced & Expert
_Goal: Probe mastery — supply-chain security, advanced networking, rootless containers, and production hardening._

### Supply Chain Security
- ❓ What is image signing and why is it important in a production pipeline? Compare Docker Content Trust (Notary v1), Sigstore/cosign, and in-toto attestations. `[INFERRED]`
- ❓ A CVE is published against a base image you use in 30+ microservices. Describe the process — tooling, workflow, policy — for detecting and remediating it at scale. `[INFERRED]` `[debugging scenario]`

### Rootless Containers
- ❓ What is a rootless container (e.g., Podman rootless, Docker rootless mode), and how does user namespace remapping make it possible? What capabilities are lost? `[INFERRED]`
- ❓ Why does running Docker in rootless mode change the behavior of bind mounts, and how does that affect dev/prod parity? `[FROM JD]` `[INFERRED]`

### Advanced Networking
- ❓ You need two containers on different Docker hosts to communicate on the same virtual network without exposing ports to the internet. What solutions exist (overlay network, WireGuard, CNI plugins), and what are the operational trade-offs? `[INFERRED]`
- ❓ A high-throughput service is suffering latency when running in a container compared to bare metal. How do you investigate whether the network stack (NAT, veth overhead) is the bottleneck, and what are your mitigation options? `[INFERRED]` `[debugging scenario]`

### OCI and the Ecosystem
- ❓ The OCI recently added the Artifact Spec alongside the Image and Runtime specs. What new use cases does it enable, and how does it change how you think about a container registry? `[FROM JD]` `[INFERRED]`
- ❓ Buildkit, Buildah, Kaniko, and ko are all ways to build OCI images. Compare their architectures and when you would choose one over another in a CI/CD pipeline. `[INFERRED]`

### Production Hardening
- ❓ Describe a defense-in-depth strategy for a containerized production workload: what controls exist at the image build layer, the runtime layer, and the orchestration layer? `[INFERRED]`
- ❓ You are asked to demonstrate that your containers are running with the least-privilege principle enforced. What concrete settings (seccomp profiles, AppArmor/SELinux, dropped capabilities, read-only root filesystem) would you show, and what does each prevent? `[INFERRED]`
