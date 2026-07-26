# L2 How do you set up interaction between a container and the host environment, such as shared volumes, environment variable files, and published ports?

Containers are isolated by default. Three primary mechanisms bridge the gap between a container and its host (or other containers): **volumes/bind mounts**, **environment variables**, and **port publishing**.

Include short code examples (Dockerfile, docker-compose, or CLI commands).

---

## 1. Volumes and Bind Mounts

### Named Volumes (preferred for persistent data)

Docker manages the storage location on the host. Data survives container restarts and removals.

```bash
# Create a named volume
docker volume create pg-data

# Mount it into a container
docker run -d \
  --name db \
  -v pg-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:   # Docker manages the host path
```

### Bind Mounts (preferred for development / config files)

A specific host path is mounted into the container. Changes on either side are immediately visible to the other.

```bash
# Mount the current directory into the container (useful for hot-reload)
docker run -d \
  --name api \
  -v "$(pwd)/src:/app/src" \
  my-node-app:dev

# Mount a config file (read-only)
docker run -d \
  --name proxy \
  -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" \
  nginx:1.27-alpine
```

```yaml
# docker-compose.yml (bind mounts)
services:
  api:
    build: .
    volumes:
      - ./src:/app/src                    # read-write bind mount (dev hot-reload)
      - ./config/app.json:/app/config.json:ro  # read-only config file
```

### tmpfs Mounts (in-memory, ephemeral)

```bash
# Useful for secrets or temporary scratch space that must not touch disk
docker run -d \
  --name app \
  --tmpfs /run:rw,size=64m \
  my-app:latest
```

---

## 2. Environment Variables

### Pass Variables Directly

```bash
# Single variable
docker run -d \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://user:pass@db:5432/mydb \
  my-app:latest
```

### Load from an Environment File

An `.env` file avoids exposing secrets on the command line and in shell history.

```
# .env.production
NODE_ENV=production
DATABASE_URL=postgres://app:s3cr3t@db:5432/appdb
REDIS_URL=redis://cache:6379
JWT_SECRET=supersecretkey
```

```bash
# CLI: load all variables from a file
docker run -d \
  --env-file .env.production \
  my-app:latest
```

```yaml
# docker-compose.yml: load from file
services:
  api:
    image: my-app:latest
    env_file:
      - .env.production    # loaded for the container
    environment:
      # Inline overrides (higher priority than env_file)
      LOG_LEVEL: debug
```

### Variable Substitution in Compose

Docker Compose reads a `.env` file in the project root and substitutes `${VAR}` references in `docker-compose.yml` itself (not just inside containers).

```bash
# .env  (project-level, used by Compose itself)
IMAGE_TAG=1.2.3
POSTGRES_PASSWORD=localonly
```

```yaml
services:
  api:
    image: myorg/my-app:${IMAGE_TAG}
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

---

## 3. Published Ports

Port publishing maps a port on the host to a port inside the container, making the service reachable from outside the container network.

Syntax: `HOST_PORT:CONTAINER_PORT`

```bash
# Publish container port 80 on host port 8080
docker run -d -p 8080:80 nginx:1.27-alpine

# Bind to a specific host interface (more secure)
docker run -d -p 127.0.0.1:8080:80 nginx:1.27-alpine

# Let Docker choose a random host port
docker run -d -p 80 nginx:1.27-alpine
docker port <container_id>   # show the assigned port

# Publish multiple ports
docker run -d \
  -p 80:80 \
  -p 443:443 \
  nginx:1.27-alpine
```

```yaml
# docker-compose.yml
services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "80:80"              # all interfaces
      - "127.0.0.1:443:443" # loopback only (safer in production)

  api:
    build: .
    ports:
      - "3000:3000"

  db:
    image: postgres:16-alpine
    # No ports section: DB is only reachable by other containers on the same network
    # Expose in development only via override file
```

---

## Putting It All Together

```bash
# A single docker run that combines all three mechanisms
docker run -d \
  --name my-app \
  -p 3000:3000 \
  --env-file .env.production \
  -e LOG_LEVEL=info \
  -v "$(pwd)/uploads:/app/uploads" \
  -v "$(pwd)/config/app.json:/app/config.json:ro" \
  my-app:1.0
```

```yaml
# Equivalent docker-compose.yml
services:
  app:
    image: my-app:1.0
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      LOG_LEVEL: info
    volumes:
      - uploads:/app/uploads
      - ./config/app.json:/app/config.json:ro

volumes:
  uploads:
```

---

## Security Considerations

- Never commit `.env` files containing real secrets to version control. Add them to `.gitignore`.
- Prefer **named volumes** over bind mounts for database data to avoid permission issues.
- Use `127.0.0.1:PORT:PORT` instead of `PORT:PORT` for ports that should not be publicly accessible.
- For production secrets, prefer Docker secrets (`docker secret create`) or an external secret manager (HashiCorp Vault, AWS Secrets Manager) over environment variable files.
