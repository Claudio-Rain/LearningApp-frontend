# L2 How does the OCI definition of a container differ from Docker's? What does each one consider a container to be?

## Docker's Definition of a Container

Docker defines a container as the **combination of an image, a writable layer, and runtime configuration** that produces an isolated, runnable environment managed by the Docker Engine.

From Docker's perspective, a container is:

- An **instance of a Docker image** (the read-only layers)
- Plus a **container-specific writable layer** (where filesystem mutations go)
- Plus **runtime metadata** stored by the Docker daemon: name, network settings, port bindings, environment variables, restart policy, health checks, resource limits, etc.
- Managed through the **Docker daemon API** (create, start, stop, inspect, rm)

Docker's model is opinionated and integrated: it bundles image building, image distribution, container runtime, networking, volumes, and logging into a single, cohesive platform. A "container" in Docker's world is inseparable from `dockerd` managing it.

## OCI's Definition of a Container

The OCI defines a container more narrowly and precisely — as the **runtime instantiation of an OCI bundle**.

An **OCI bundle** consists of two things:

1. **A root filesystem** (the unpacked image layers, typically at `rootfs/`)
2. **A `config.json` file** — a declarative specification that describes:
   - The process to run (`args`, `env`, `cwd`)
   - Linux-specific isolation: namespaces to create, cgroups to apply, seccomp/AppArmor/SELinux profiles
   - Mount points (including `/proc`, `/sys`, `tmpfs`, bind mounts)
   - Root filesystem path
   - Hooks (lifecycle callbacks: `prestart`, `createRuntime`, `poststart`, `poststop`)

A container, per the OCI Runtime Spec, is what a **compliant runtime** (e.g., `runc`, `crun`, `youki`) creates when it executes `run` on a bundle. The runtime is responsible for:

- Setting up the requested namespaces and cgroups
- Pivoting the root to the provided `rootfs`
- Starting the specified process

The OCI spec says nothing about how images are built, stored, or distributed — those concerns are addressed by the Image Spec and Distribution Spec separately.

## Side-by-Side Comparison

| Dimension | Docker's Container | OCI's Container |
|---|---|---|
| Definition | Running image instance managed by `dockerd` | Runtime instance of an OCI bundle (`rootfs` + `config.json`) |
| Scope | Broad: includes networking, volumes, logging, health checks, restart policies | Narrow: just the isolated process and its filesystem |
| Runtime dependency | Requires Docker Engine (`dockerd` / `containerd`) | Requires any OCI-compliant runtime (`runc`, `crun`, etc.) |
| Image coupling | Tight: container is directly tied to a Docker image | Loose: bundle is just a directory; image unpacking is a separate step |
| State management | Managed centrally by the daemon (named containers, events, inspect) | The runtime records minimal state (e.g., PID file); orchestration is out of scope |
| Configuration | CLI flags / Compose YAML / API calls to daemon | Declarative `config.json` file in the bundle |

## Practical Implication

Docker is an OCI-compliant implementation. When you run `docker run nginx`, Docker internally:

1. Pulls the OCI image (Image Spec)
2. Unpacks it into a root filesystem
3. Generates a `config.json` from your CLI flags
4. Calls `containerd` → `runc` (OCI runtime) to start the container

So Docker's user-facing concept of a "container" is a higher-level abstraction built on top of the OCI's precise, low-level definition.

```bash
# You can observe the OCI bundle Docker generates
# (requires knowing the container's full ID)
CONTAINER_ID=$(docker inspect --format '{{.Id}}' my-container)
cat /var/lib/docker/containers/${CONTAINER_ID}/config.v2.json

# runc (the OCI runtime) can be invoked directly on a bundle
# without Docker at all:
mkdir -p /tmp/mycontainer/rootfs
# ... populate rootfs and write config.json ...
runc run mycontainer-id
```
