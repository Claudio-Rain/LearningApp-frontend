# Interview Questions: Containerization

## Level 1

### Concepts
- L1 What is the difference between a container and a virtual machine? `[FROM JD]`
- L1 What is the difference between a container image and a running container? `[FROM JD]`
- L1 What is a daemon service and why is it important in the context of containerization? `[FROM JD]`

### Tooling
- L1 Which containerization tool do you use, and can you walk through a typical workflow with it? `[FROM JD]`
- L1 How do you use the CLI to manage images, containers, volumes, and networks? `[FROM JD]`
- L1 How do you pull and use a predefined image from a remote repository (e.g., Docker Hub) in your own configuration? `[FROM JD]`

---

## Level 2

### Standards & Configuration
- L2 What is the Open Container Initiative (OCI) and what problem does it solve? `[FROM JD]`
- L2 How does the OCI definition of a container differ from Docker's? What does each one consider a container to be? `[FROM JD]`
- L2 How do you write a configuration file (e.g., Dockerfile or Containerfile) for a containerized application? `[FROM JD]`
- L2 What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile, and when would you use each?
- L2 How do you maintain a multi-container configuration (e.g., using Docker Compose or a similar tool)? `[FROM JD]`
- L2 How do you set up interaction between a container and the host environment, such as shared volumes, environment variable files, and published ports? `[FROM JD]`

---

## Level 3

### Production Concerns
- L3 What is a multi-stage Docker build and why is it useful for production images?
- L3 How do you manage secrets and environment variables in containers securely — what should never go into a Dockerfile?
- L3 What are Docker network modes (bridge, host, overlay) and when would you use each?
