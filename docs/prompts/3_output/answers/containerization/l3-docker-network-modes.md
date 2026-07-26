# L3 What are Docker network modes (bridge, host, overlay) and when would you use each?

## Overview

Docker provides several network drivers that determine how containers communicate with each other and with the outside world.

| Driver | Scope | Isolation | Use case |
|--------|-------|-----------|----------|
| `bridge` | Single host | Yes (own network namespace) | Default for standalone containers |
| `host` | Single host | No (shares host network namespace) | High-performance, low-latency services |
| `overlay` | Multi-host | Yes | Docker Swarm / multi-host container networking |
| `none` | Single host | Full (no network) | Security-sensitive, batch jobs |
| `macvlan` | Single host | Yes | Containers that need a real MAC/IP on the LAN |

---

## Bridge Network (Default)

Docker creates a virtual network bridge (`docker0`) on the host. Each container gets its own network namespace with a private IP on the bridge subnet (typically `172.17.0.0/16`).

```
Host (192.168.1.10)
│
├─ docker0 bridge (172.17.0.1)
│   ├─ container-a (172.17.0.2)
│   └─ container-b (172.17.0.3)
│
└─ eth0 → internet (NAT via iptables)
```

### Default bridge vs user-defined bridge

```bash
# User-defined bridge (strongly preferred)
docker network create my-app-net

docker run -d --name api   --network my-app-net myapp:api
docker run -d --name redis --network my-app-net redis:7-alpine
```

On a user-defined bridge, containers can resolve each other **by name** (`api`, `redis`). On the default `docker0` bridge, only IPs work (no DNS).

### Port publishing (bridge → host)

```bash
docker run -p 8080:80 nginx   # host:8080 → container:80
```

### When to use bridge

- Default for any standalone container or Docker Compose stack.
- Multiple isolated apps on the same host — each in its own network.
- Development environments.

---

## Host Network

The container shares the host's network namespace directly. No virtual interface, no NAT, no port mapping needed.

```bash
docker run --network host nginx
# nginx binds directly to host port 80 — no -p flag needed or applicable
```

```
Host (192.168.1.10)  ←── container IS the host network
│
└─ eth0 → internet
```

### Characteristics

- **Lowest latency**: no NAT translation, no virtual interface overhead.
- **Port conflicts**: if two containers both try to bind port 8080, one fails.
- **Isolation is lost**: container can see all host interfaces and bind to any port.
- **Linux only**: host networking is not available on Docker Desktop for macOS/Windows (the VM layer makes it meaningless).

### When to use host

- Network-intensive applications where NAT overhead matters (high-throughput proxies, packet capture tools).
- Monitoring agents that need to see host network interfaces (`netdata`, `prometheus node_exporter`).
- Applications that use dynamic port ranges or UDP multicast.

---

## Overlay Network

Overlay networks span **multiple Docker hosts** using VXLAN encapsulation. A distributed key-value store (Raft in Swarm, or etcd in Kubernetes) synchronizes network state.

```
Host A                        Host B
├─ container-api              ├─ container-db
│   └─ overlay0 (10.0.0.2)   │   └─ overlay0 (10.0.0.3)
│                             │
└─ eth0 ──────── VXLAN ────── └─ eth0
```

Containers on different hosts can communicate using their overlay IP as if they were on the same LAN.

```bash
# Docker Swarm — overlay is created automatically per stack
docker network create \
  --driver overlay \
  --attachable \          # allows standalone containers to join
  my-swarm-net

docker service create \
  --network my-swarm-net \
  --replicas 3 \
  myapp:api
```

### When to use overlay

- Docker Swarm deployments (multi-host services).
- Any scenario where containers on different hosts must communicate without exposing ports publicly.
- Replacing overlay with a CNI plugin (Flannel, Calico, Cilium) is the Kubernetes equivalent.

---

## None Network

The container has no network interface except loopback. Completely isolated from all networks.

```bash
docker run --network none myapp:batch-processor
```

### When to use none

- Batch jobs that only read from a mounted volume and write to another.
- Security-sensitive workloads (cryptographic operations, secret generation).
- Testing container logic in isolation.

---

## Comparison Table

| Feature | bridge | host | overlay | none |
|---------|--------|------|---------|------|
| Container DNS by name | User-defined only | N/A | Yes | N/A |
| Port publishing needed | Yes | No | No (within overlay) | N/A |
| Multi-host | No | No | Yes | No |
| Network isolation | Yes | No | Yes | Full |
| NAT overhead | Yes | No | Yes (VXLAN) | N/A |
| Available on macOS/Win Docker Desktop | Yes (via VM) | No | Yes (Swarm) | Yes |

---

## Docker Compose Example (bridge with isolation)

```yaml
version: "3.9"

services:
  api:
    image: myapp:api
    networks:
      - frontend
      - backend

  db:
    image: postgres:16
    networks:
      - backend        # not reachable from frontend

  nginx:
    image: nginx:1.27
    ports:
      - "80:80"
    networks:
      - frontend       # not reachable from backend

networks:
  frontend:
  backend:             # separate bridge — db unreachable from nginx
```

This pattern isolates the database on a back-end network while the API bridges both, enforcing a network perimeter at the Docker layer without firewall rules.
