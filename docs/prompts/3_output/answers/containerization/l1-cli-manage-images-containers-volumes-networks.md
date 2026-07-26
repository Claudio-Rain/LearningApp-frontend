# L1 How do you use the CLI to manage images, containers, volumes, and networks?

The Docker CLI is organized around resource types. Every subcommand follows the pattern `docker <resource> <action>`. Include short code examples (Dockerfile, docker-compose, or CLI commands).

---

## Images

```bash
# List local images
docker images
docker image ls

# Pull an image from a registry
docker pull nginx:1.27

# Build an image from a Dockerfile in the current directory
docker build -t my-app:latest .

# Tag an existing image
docker tag my-app:latest myrepo/my-app:1.0

# Push to a registry
docker push myrepo/my-app:1.0

# Remove a local image
docker rmi nginx:1.27
docker image rm nginx:1.27

# Remove all dangling (untagged) images
docker image prune

# Remove all unused images (not just dangling)
docker image prune -a

# Inspect image metadata (layers, env, entrypoint, etc.)
docker inspect nginx:1.27

# Show image layer history
docker history nginx:1.27
```

---

## Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Run a container (detached, with name and port mapping)
docker run -d --name web -p 8080:80 nginx:1.27

# Run interactively with a shell
docker run -it --rm ubuntu:22.04 bash

# Stop a running container (sends SIGTERM, then SIGKILL after timeout)
docker stop web

# Start a stopped container
docker start web

# Restart
docker restart web

# Remove a stopped container
docker rm web

# Force-remove a running container
docker rm -f web

# Remove all stopped containers
docker container prune

# View logs (follow mode)
docker logs -f web

# Execute a command inside a running container
docker exec -it web sh

# Copy files between host and container
docker cp ./config.json web:/app/config.json
docker cp web:/app/output.log ./output.log

# Inspect full container metadata
docker inspect web

# View real-time resource usage
docker stats
```

---

## Volumes

Volumes are managed storage that persists beyond the container lifecycle.

```bash
# List volumes
docker volume ls

# Create a named volume
docker volume create my-data

# Inspect a volume (shows mountpoint on host)
docker volume inspect my-data

# Use a volume when running a container
docker run -d --name db \
  -v my-data:/var/lib/postgresql/data \
  postgres:16

# Remove a volume
docker volume rm my-data

# Remove all unused volumes
docker volume prune
```

---

## Networks

```bash
# List networks
docker network ls

# Create a custom bridge network
docker network create my-net

# Run containers on the same network (they can reach each other by name)
docker run -d --name api --network my-net my-app:latest
docker run -d --name db  --network my-net postgres:16

# Connect an existing container to a network
docker network connect my-net web

# Disconnect a container from a network
docker network disconnect my-net web

# Inspect network details (connected containers, subnet, gateway)
docker network inspect my-net

# Remove a network
docker network rm my-net

# Remove all unused networks
docker network prune
```

---

## Global Cleanup

```bash
# Remove ALL unused resources (containers, images, volumes, networks) at once
docker system prune -a --volumes

# Check disk usage by Docker resources
docker system df
```
