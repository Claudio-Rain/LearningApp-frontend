# L2 What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile, and when would you use each?

## Quick Summary

| Instruction | Purpose | Overridable at runtime? |
|-------------|---------|------------------------|
| `ENTRYPOINT` | Defines the **executable** — the main process that always runs | Only with `--entrypoint` flag |
| `CMD` | Provides **default arguments** to ENTRYPOINT, or a default command if no ENTRYPOINT is set | Yes — any argument after the image name on `docker run` replaces CMD |

---

## How They Interact

The container's actual command is assembled as:

```
ENTRYPOINT  +  CMD
```

```dockerfile
ENTRYPOINT ["python", "app.py"]
CMD        ["--port", "8080"]
```

- `docker run myimage` → runs `python app.py --port 8080`
- `docker run myimage --port 9090` → runs `python app.py --port 9090` (CMD replaced)
- `docker run --entrypoint /bin/sh myimage` → runs `/bin/sh` (ENTRYPOINT replaced)

---

## Shell Form vs Exec Form

Both instructions support two syntaxes:

```dockerfile
# Shell form — wraps in /bin/sh -c; does NOT receive Unix signals correctly
CMD python app.py

# Exec form — runs directly as PID 1; signals (SIGTERM) propagate correctly
CMD ["python", "app.py"]
```

**Always prefer exec form** in production images. Shell form means your app runs as a child of `/bin/sh`, so `docker stop` sends SIGTERM to the shell, not your app, causing ungraceful shutdowns.

---

## Common Patterns

### 1. ENTRYPOINT as the executable, CMD as defaults (most common)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

ENTRYPOINT ["python", "app.py"]
CMD ["--host", "0.0.0.0", "--port", "8080"]
```

Operators can override the port without re-specifying the executable:
```bash
docker run myimage --port 9090
```

### 2. CMD only — flexible, fully overridable command

```dockerfile
FROM ubuntu:24.04
CMD ["bash"]
```

`docker run myimage ls -la` runs `ls -la` instead of `bash`. Good for utility/toolbox images.

### 3. ENTRYPOINT as a wrapper script

```dockerfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["server"]
```

`entrypoint.sh` can perform initialization (wait for DB, inject secrets) then `exec "$@"` to hand off to CMD:

```bash
#!/bin/sh
set -e
# wait for database
until pg_isready -h "$DB_HOST"; do sleep 1; done
# hand off to the actual command
exec "$@"
```

### 4. ENTRYPOINT only — fixed, non-overridable command

```dockerfile
ENTRYPOINT ["nginx", "-g", "daemon off;"]
```

No CMD means no default arguments — any extra `docker run` argument is appended to ENTRYPOINT. Good when the container has exactly one purpose.

---

## Decision Guide

| Use case | Recommendation |
|----------|---------------|
| App with configurable flags | `ENTRYPOINT` = executable, `CMD` = default flags |
| General-purpose toolbox image | `CMD` only |
| Init wrapper + main command | `ENTRYPOINT` = wrapper script, `CMD` = default subcommand |
| Single fixed purpose (nginx, redis) | `ENTRYPOINT` only |
| Docker Compose service with override | `ENTRYPOINT` = executable, override `command:` in compose file (maps to CMD) |

---

## Common Mistake

Using shell form for ENTRYPOINT breaks signal handling:

```dockerfile
# BAD — PID 1 is /bin/sh, not your app
ENTRYPOINT python app.py

# GOOD — PID 1 is python, receives SIGTERM directly
ENTRYPOINT ["python", "app.py"]
```

This matters for graceful shutdown in Kubernetes (SIGTERM → drain connections) and Docker Swarm.
