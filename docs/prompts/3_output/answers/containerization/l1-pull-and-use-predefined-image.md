# L1 How do you pull and use a predefined image from a remote repository (e.g., Docker Hub) in your own configuration?

## What is a Remote Image Registry?

A registry is a server that stores and distributes container images. **Docker Hub** (`hub.docker.com`) is the default public registry. Others include:

- **GHCR** — GitHub Container Registry (`ghcr.io`)
- **ECR** — Amazon Elastic Container Registry (`<account>.dkr.ecr.<region>.amazonaws.com`)
- **GCR** — Google Artifact Registry (`gcr.io`)
- Self-hosted: **Harbor**, **Nexus**, **Gitea**

Include short code examples (Dockerfile, docker-compose, or CLI commands).

---

## 1. Pull an Image Manually

```bash
# Pull the latest tag (implicitly uses Docker Hub)
docker pull postgres

# Pull a specific version tag (recommended for reproducibility)
docker pull postgres:16-alpine

# Pull from a non-default registry
docker pull ghcr.io/myorg/my-app:1.0
```

After pulling, the image is cached locally and subsequent `docker run` calls use the cached version.

---

## 2. Use a Pulled Image Directly via CLI

```bash
# Run a PostgreSQL container using the official image
docker run -d \
  --name my-db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=appdb \
  -p 5432:5432 \
  -v pg-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

Docker automatically pulls the image if it is not already present locally.

---

## 3. Use a Predefined Image as a Base in Your Own Dockerfile

The most common use case is extending a public image with your own application code.

```dockerfile
# Dockerfile
# Use the official Node.js image from Docker Hub as the base
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests and install
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build your custom image (which layers on top of node:20-alpine)
docker build -t my-node-app:1.0 .
docker run -d -p 3000:3000 my-node-app:1.0
```

---

## 4. Reference a Public Image in Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build: .              # built from local Dockerfile (which extends a public image)
    ports:
      - "3000:3000"
    depends_on:
      - db

  db:
    image: postgres:16-alpine   # pulled directly from Docker Hub
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pg-data:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine       # another public image

volumes:
  pg-data:
```

```bash
docker compose up -d
```

---

## 5. Authenticate for Private Registries

```bash
# Docker Hub (private repos or higher rate limits)
docker login

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Amazon ECR (uses AWS CLI to generate a temporary token)
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    123456789.dkr.ecr.us-east-1.amazonaws.com
```

---

## Key Best Practices

- Always pin to a specific tag (e.g., `postgres:16-alpine`) rather than `latest` to ensure reproducible builds.
- Prefer **slim** or **alpine** variants for smaller images and a reduced attack surface.
- Verify image authenticity using **Docker Content Trust** (`DOCKER_CONTENT_TRUST=1`) or image digest pinning (`image@sha256:<hash>`).
