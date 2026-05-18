# Interview Questions: Containerization

## Coverage map

| Item | Type | Level |
|------|------|-------|
| Difference between containers and virtual machines | Knowledge | Level 1 — Definition & Basics |
| What is the difference between images and containers | Knowledge | Level 1 — Definition & Basics |
| What is a daemon service and why it is important | Knowledge | Level 2 — Core Concepts |
| What is Open Container Initiative (OCI)? | Knowledge | Level 2 — Core Concepts |
| OCI vs Docker: What is a container? | Knowledge | Level 2 — Core Concepts |
| How to work with the containerization tool's CLI | Knowledge | Level 3 — Practical Usage |
| Uses a tool for containerization | Skill | Level 3 — Practical Usage |
| Creates configuration files for containerized applications | Skill | Level 3 — Practical Usage |
| Uses predefined images from remote repositories | Skill | Level 3 — Practical Usage |
| Maintains cross-container configurations | Skill | Level 3 — Practical Usage |
| Sets up interaction between container and actual environment | Skill | Level 3 — Practical Usage |

---

## Level 1 — Definition & Basics
_Goal: Confirm the candidate knows what containers are and why they exist._

### Containers vs VMs
- ❓ What is a container? What problem does it solve compared to deploying directly on a host? `[INFERRED]`
- ❓ What is the difference between a container and a virtual machine? `[FROM JD]`
- ❓ What is the difference between a Docker image and a running container? `[FROM JD]`
- ❓ What does "build once, run anywhere" mean in the context of containers? `[INFERRED]`

---

## Level 2 — Core Concepts
_Goal: Test understanding of the ecosystem, standards, and daemon architecture._

### OCI and Standards
- ❓ What is the Open Container Initiative (OCI)? Why does it matter? `[FROM JD]`
- ❓ What is the difference between OCI and Docker? Is Docker the only container runtime? `[FROM JD]`
- ❓ What is containerd and how does it relate to Docker? `[INFERRED]`

### Daemon
- ❓ What is the Docker daemon (`dockerd`)? Why is it important and what does it manage? `[FROM JD]`
- ❓ What are the security implications of running the Docker daemon as root? `[INFERRED]`
- ❓ What is a rootless container and why might you prefer it? `[INFERRED]`

### Images
- ❓ What is a container image layer? How do layers affect image size and build speed? `[INFERRED]`
- ❓ What is a base image? What is the difference between `scratch`, `alpine`, and `ubuntu` as base images? `[INFERRED]`

---

## Level 3 — Practical Usage
_Goal: Test ability to write Dockerfiles, use the CLI, and configure multi-container setups._

### CLI Basics
- ❓ What Docker CLI command do you use to build an image from a Dockerfile? `[FROM JD]`
- ❓ How do you list running containers? How do you list all containers including stopped ones? `[FROM JD]`
- ❓ How do you start a container in detached mode and then view its logs? `[FROM JD]`
- ❓ How do you remove all stopped containers in one command? `[FROM JD]`
- ❓ How do you pull an image from Docker Hub? `[FROM JD]`

### Dockerfile
- ❓ Write a minimal Dockerfile for a .NET 8 Web API application. `[FROM JD]`
- ❓ What is a multi-stage Dockerfile build? Why would you use it? `[FROM JD]`
- ❓ What is the difference between `CMD` and `ENTRYPOINT`? `[INFERRED]`
- ❓ What is the difference between `RUN`, `CMD`, and `ENTRYPOINT`? `[INFERRED]`
- ❓ What does the `.dockerignore` file do and why is it important? `[INFERRED]`

### Docker Compose
- ❓ What is Docker Compose and when do you use it? `[FROM JD]`
- ❓ Write a `docker-compose.yml` that runs a web API and a PostgreSQL database together. `[FROM JD]`
- ❓ How do you pass environment variables to a container in Compose? How do you use a `.env` file? `[FROM JD]`
- ❓ How do you define a named volume in Compose and mount it into a container? `[FROM JD]`
- ❓ How do you publish a container's port to the host? `[FROM JD]`

### Remote Images
- ❓ How do you reference a specific tag of an image from Docker Hub in your Dockerfile? `[FROM JD]`
- ❓ What is a private container registry and how do you authenticate to pull images from one? `[INFERRED]`

---

## Level 4 — Common Pitfalls
_Goal: Expose common mistakes in containerization workflows._

### Mistakes
- ❓ A developer runs `COPY . .` in their Dockerfile and the image is 2 GB. What is likely wrong and how do you fix it? `[INFERRED]`
- ❓ Why is it a bad practice to run your application as `root` inside a container? `[INFERRED]`
- ❓ What happens to data written inside a container when the container is stopped or removed? `[INFERRED]`
- ❓ Your container starts but the app can't connect to the database even though both are in the same Compose file. What are the likely causes? `[INFERRED]`
- ❓ You've pinned your Dockerfile to `FROM node:latest`. Why is this problematic in production? `[INFERRED]`

---

## Level 5 — Internals & Deep Mechanics
_Goal: Test understanding of how containers work at the OS level._

### Linux Primitives
- ❓ What Linux kernel features do containers rely on — namespaces and cgroups? What does each provide? `[INFERRED]`
- ❓ What is a namespace in the Linux kernel context? Name at least three types and what they isolate. `[INFERRED]`
- ❓ What are cgroups and how do they relate to container resource limits (CPU, memory)? `[INFERRED]`

### Union Filesystems
- ❓ What is a union filesystem (e.g., OverlayFS) and how does it enable Docker's layered image system? `[INFERRED]`
- ❓ How does copy-on-write work in a running container's writable layer? `[INFERRED]`

---

## Level 6 — Trade-offs & Design Decisions
_Goal: Evaluate architectural judgment about containers._

### Design Decisions
- ❓ Should you run multiple processes inside a single container, or one process per container? Defend your answer. `[INFERRED]`
- ❓ Containers vs. VMs: when would you still choose a VM over a container for a workload? `[FROM JD]`
- ❓ When would you choose Podman or another container runtime over Docker? `[INFERRED]`
- ❓ How do you decide what belongs in a volume vs. baked into the image? `[INFERRED]`

---

## Level 7 — Advanced & Expert
_Goal: Probe orchestration-level and production-hardening knowledge._

### Orchestration and Production
- ❓ What problems does Docker Compose not solve that Kubernetes does? `[INFERRED]`
- ❓ What is a container health check and how do you define one? `[INFERRED]`
- ❓ How do you handle secrets (API keys, DB passwords) in a containerized environment without baking them into the image? `[INFERRED]`
- ❓ What is an init process inside a container and why do you sometimes need one (e.g., `tini`)? `[INFERRED]`
- ❓ How would you design a zero-downtime rolling deployment for a containerized service? `[INFERRED]`
