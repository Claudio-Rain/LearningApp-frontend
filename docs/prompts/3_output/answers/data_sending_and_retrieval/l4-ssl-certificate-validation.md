# L4 What is the risk of disabling SSL certificate validation and how should you handle self-signed certs in development?

## What SSL Certificate Validation Does

When `HttpClient` establishes a TLS connection, it validates the server's certificate against several criteria:
1. **Chain of trust** — the certificate is signed by a trusted Certificate Authority (CA).
2. **Expiry** — the certificate has not expired.
3. **Hostname match** — the `CN` or `SAN` matches the hostname being connected to.
4. **Revocation** — the certificate has not been revoked (OCSP / CRL).

If any check fails, the connection is refused — protecting the client from man-in-the-middle (MITM) attacks.

---

## The Anti-Pattern: Disabling Validation Globally

```csharp
// NEVER do this in production
var handler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = (_, _, _, _) => true
};
var client = new HttpClient(handler);
```

### Why This Is Dangerous
- **MITM attacks**: an attacker between the client and server can intercept and modify all traffic — credentials, tokens, personal data.
- **False confidence**: HTTPS still shows in the URL, but the connection is no longer secure.
- **Compliance violations**: PCI-DSS, HIPAA, SOC 2 explicitly prohibit disabling certificate validation.
- **Spreads to production**: "temporary" dev hacks regularly ship to production.

---

## The Right Approach for Development: Trust Specific Certificates

Instead of disabling validation entirely, configure the client to accept **only your specific self-signed cert**.

### Option 1: Validate Against a Known Thumbprint

```csharp
// Read the expected thumbprint from config, not hardcoded
var expectedThumbprint = configuration["DevCert:Thumbprint"]!;

var handler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = (_, cert, _, errors) =>
    {
        if (cert is null) return false;

        // Accept the cert if it matches our known self-signed thumbprint
        if (cert.Thumbprint.Equals(expectedThumbprint, StringComparison.OrdinalIgnoreCase))
            return true;

        // Otherwise apply normal validation
        return errors == SslPolicyErrors.None;
    }
};
```

### Option 2: Load the Self-Signed Cert as a Trusted Root

Add the development CA certificate to the handler's custom trust store:

```csharp
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(
    new X509Certificate2("/path/to/dev-ca.crt"));

// Or add to the root store only for this handler:
var handler = new SocketsHttpHandler();
var sslOptions = new SslClientAuthenticationOptions
{
    RemoteCertificateValidationCallback = (_, cert, chain, errors) =>
    {
        // Add our dev CA to the extra certs that chain validation can use
        chain!.ChainPolicy.ExtraStore.Add(devCaCert);
        chain.ChainPolicy.VerificationFlags = X509VerificationFlags.AllowUnknownCertificateAuthority;
        return chain.Build((X509Certificate2)cert!);
    }
};
```

### Option 3: `dotnet dev-certs` (Recommended for Local HTTPS)

For local ASP.NET Core development, the SDK provides a trusted development certificate:

```bash
dotnet dev-certs https --trust
```

This installs a self-signed cert into the system's trusted root store (macOS Keychain / Windows Certificate Store / Linux nss), so `HttpClient` trusts it automatically — no callback hacks required.

---

## Environment-Based Guard

If a workaround is absolutely necessary during development, gate it strictly on the environment:

```csharp
var handler = new HttpClientHandler();

if (environment.IsDevelopment())
{
    // Scope the bypass to a specific known host
    handler.ServerCertificateCustomValidationCallback = (message, cert, chain, errors) =>
    {
        if (message.RequestUri?.Host == "local.dev.internal")
            return true; // accept self-signed for this host only

        return errors == SslPolicyErrors.None;
    };
}

builder.Services.AddHttpClient("InternalApi")
    .ConfigurePrimaryHttpMessageHandler(() => handler);
```

---

## Self-Signed Certificates in Staging / CI

For non-local environments (Docker, CI pipelines, staging):

1. **Generate a proper cert** from a private CA (e.g., using `openssl` or a tool like `mkcert`).
2. Mount the CA cert into the container and add it to the system trust store:
   ```dockerfile
   COPY dev-ca.crt /usr/local/share/ca-certificates/dev-ca.crt
   RUN update-ca-certificates
   ```
3. `HttpClient` will then trust it via the normal chain validation — no code changes needed.

---

## Key Takeaways
- Disabling SSL validation globally (`(_, _, _, _) => true`) removes all MITM protection and must never reach production.
- The correct development approach is to **trust your specific cert** (by thumbprint or adding it to the trust store) rather than trusting all certs.
- `dotnet dev-certs https --trust` is the easiest solution for local ASP.NET Core development.
- For CI/Docker, install the self-signed CA into the container's system trust store instead of patching the code.
- Any certificate bypass must be gated behind an `IsDevelopment()` or equivalent environment check.
