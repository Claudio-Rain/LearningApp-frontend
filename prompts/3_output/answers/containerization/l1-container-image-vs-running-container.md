# L1 What is the difference between a container image and a running container?

## Container Image

A container image is a **read-only, layered snapshot** of a filesystem and metadata needed to run an application. Think of it as a class or a blueprint.

Key characteristics:
- Immutable — it never changes after it is built.
- Composed of **layers** (each `RUN`, `COPY`, or `ADD` instruction in a Dockerfile adds a layer).
- Stored in a registry (e.g., Docker Hub, GHCR, ECR) and pulled to a host before use.
- Contains everything the application needs: OS libs, runtime, dependencies, app code, and a default start command.

An image is identified by a **name and tag** (e.g., `nginx:1.27`) and internally by a content-addressable SHA-256 digest.

## Running Container

A running container is a **live instance** of an image — the image's filesystem brought to life as an isolated process. Think of it as an object instantiated from a class.

Key characteristics:
- Has a **writable layer** on top of the image's read-only layers (via OverlayFS).
- Has its own network namespace (IP, ports), PID namespace, and mount namespace.
- Has a lifecycle: created → running → paused → stopped → removed.
- State (files written at runtime) exists only in the writable layer and is lost when the container is removed, unless mounted to a volume.

## Analogy

| Concept | Image | Container |
|---|---|---|
| OOP | Class | Instance |
| OS | Program binary on disk | Running process |
| Template | Cookie cutter | Cookie |

## Practical difference

```bash
# An image sits on disk — not consuming CPU or RAM
docker images
# REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
# nginx        1.27      a72860cb95fd   2 weeks ago    192MB

# A container is a live process — consuming resources
docker run -d --name web nginx:1.27
docker ps
# CONTAINER ID   IMAGE        COMMAND                  STATUS         PORTS
# 3f7c1a2b9e01   nginx:1.27   "/docker-entrypoint.…"  Up 5 seconds   80/tcp

# Multiple containers can be spawned from one image
docker run -d --name web2 nginx:1.27
docker run -d --name web3 nginx:1.27
```

Each container gets its own writable layer; they all share the same underlying image layers (no duplication on disk).
