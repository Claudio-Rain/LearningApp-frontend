# L3 How do you manage secrets and environment variables in containers securely — what should never go into a Dockerfile?

## What Should NEVER Go Into a Dockerfile

| What | Why it is dangerous |
|------|---------------------|
| Passwords, API keys, connection strings | Every `RUN`, `ENV`, and `ARG` layer is baked into the image and visible with `docker history` |
| Private SSH keys or TLS certificates | Copied files persist in the layer even after `RUN rm` |
| `.env` files with real credentials | `COPY .env .` pushes secrets into the image |
| Hardcoded `ARG` values with secrets | Build args appear in `docker history --no-trunc` |

Even if you delete a file in a later layer (`RUN rm secret.txt`), the file still exists in the earlier layer and can be extracted with `docker save`.

---

## The Wrong Way (What to Avoid)

```dockerfile
# BAD: secret visible in docker history
ENV DB_PASSWORD=supersecret

# BAD: even though ARG is not persisted in the final image,
#      it appears in build history and is passed as a plain CLI flag
ARG DB_PASSWORD
RUN echo "$DB_PASSWORD" > /app/config.txt

# BAD: copies real credentials into the image
COPY .env /app/.env
```

---

## Correct Approach 1: Environment Variables at Runtime

The Dockerfile declares the variable name without a value. The value is injected at container start time only.

```dockerfile
# Dockerfile — no secret values here
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Api.dll"]
# No ENV with sensitive values
```

```bash
# docker run — value injected at runtime, never in the image
docker run \
  -e DB_PASSWORD="$(vault read -field=password secret/db)" \
  myapp:prod
```

```yaml
# docker-compose.yml — reference from host environment or .env file (never commit .env)
services:
  api:
    image: myapp:prod
    environment:
      - DB_PASSWORD          # pulled from host environment variable
```

The `.env` file used by Docker Compose **must be in `.gitignore`** and never committed.

---

## Correct Approach 2: Docker Secrets (Swarm / Compose v3)

Docker secrets mount sensitive values as **in-memory files** inside the container at `/run/secrets/<name>`. They are never stored in the image or environment variables.

```bash
# Create the secret
echo "supersecret" | docker secret create db_password -

# Reference in a Swarm service
docker service create \
  --secret db_password \
  myapp:prod
```

```yaml
# docker-compose.yml (Swarm mode)
services:
  api:
    image: myapp:prod
    secrets:
      - db_password

secrets:
  db_password:
    external: true   # managed by Docker secret store
```

Application reads the secret from a file:
```csharp
// C# — read from the mounted secret file
var password = File.ReadAllText("/run/secrets/db_password").Trim();
```

---

## Correct Approach 3: External Secret Stores

For production Kubernetes or cloud environments, integrate with a dedicated secret manager:

| Platform | Tool | How it works |
|----------|------|-------------|
| Kubernetes | Secrets + CSI driver, External Secrets Operator | Secrets mounted as volume or injected as env at pod start |
| AWS | AWS Secrets Manager + ECS task definition | ECS injects secrets from Secrets Manager as env vars |
| Azure | Azure Key Vault + AKS CSI driver | Key Vault secrets mounted as files in the pod |
| HashiCorp | Vault Agent Injector | Sidecar injects secrets into the pod filesystem |

```yaml
# Kubernetes: reference a Secret as an environment variable
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password
```

---

## Build-Time Secrets (When You Must Access Secrets During Build)

Sometimes a build step needs a secret (e.g., pulling from a private npm registry). Use **BuildKit's `--mount=type=secret`** — the secret is available only during that `RUN` instruction and never written to any layer.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .

# Secret is mounted as /run/secrets/npm_token during this RUN only
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN && \
    npm ci && \
    npm config delete //registry.npmjs.org/:_authToken
```

```bash
# Pass the secret at build time — never in the Dockerfile itself
docker buildx build \
  --secret id=npm_token,env=NPM_TOKEN \
  -t myapp:prod .
```

---

## Environment Variable Classification

| Category | Example | Safe in Dockerfile? |
|----------|---------|---------------------|
| Non-sensitive config | `PORT=8080`, `LOG_LEVEL=info` | Yes |
| Feature flags | `FEATURE_NEW_UI=true` | Yes |
| Credentials / keys | `DB_PASSWORD`, `API_SECRET` | No — runtime only |
| Connection strings with credentials | `DB_URL=postgres://user:pass@host/db` | No — runtime only |

---

## Summary Checklist

- [ ] No passwords, keys, or connection strings in `ENV` or `ARG` instructions.
- [ ] `.env` files are in `.gitignore` and `.dockerignore`.
- [ ] Production images use runtime injection (env vars, mounted secrets, secret store).
- [ ] Build-time secrets use BuildKit `--mount=type=secret`.
- [ ] Scan images with `trivy` or `docker scout` to detect accidentally embedded secrets.
- [ ] Rotate any secret that was ever accidentally committed to a Dockerfile.
