# L1 What is the difference between a container and a virtual machine?

## Virtual Machines (VMs)

A virtual machine emulates a complete physical computer. It runs on top of a **hypervisor** (e.g., VMware, VirtualBox, Hyper-V) that abstracts the underlying hardware. Each VM includes:

- A full guest operating system (kernel + userland)
- Virtualized hardware (CPU, RAM, disk, NIC)
- Its own process scheduler, memory manager, and drivers

Because every VM carries a full OS, they are typically **gigabytes** in size and can take **minutes** to start.

## Containers

A container is an isolated process (or group of processes) running directly on the **host kernel**. Isolation is achieved using Linux kernel primitives:

- **Namespaces** — isolate the process tree, network stack, mount points, user IDs, hostname, and IPC.
- **cgroups (control groups)** — limit and account for CPU, memory, disk I/O, and network bandwidth.
- **Union/overlay filesystems** (e.g., OverlayFS) — layer a read-write layer on top of a read-only image.

Containers share the host OS kernel, so they are **megabytes** in size and start in **milliseconds**.

## Side-by-side comparison

| Dimension | Container | Virtual Machine |
|---|---|---|
| OS kernel | Shared with host | Separate guest kernel |
| Startup time | Milliseconds | Seconds to minutes |
| Image size | MBs | GBs |
| Isolation level | Process/namespace level | Full hardware emulation |
| Portability | High (OCI images) | Medium (hypervisor-specific) |
| Overhead | Very low | Higher (guest OS overhead) |
| Typical use | Microservices, CI/CD, serverless | Legacy apps, strong isolation, different OS |

## When to choose which

- **Containers** are preferred for stateless, cloud-native workloads where density and fast startup matter.
- **VMs** are preferred when you need strong security boundaries, a different OS than the host (e.g., running Windows on Linux), or legacy software that assumes a full OS.

In practice, containers often run *inside* VMs (e.g., Kubernetes nodes are VMs, but workloads inside are containers), combining the security of VM isolation with the density of containers.
