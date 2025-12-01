# Enterprise Integration Guide

Guidelines for running SalesforceCore in enterprise environments.

## Architecture Choices
- Separate core library from UI: use SalesforceCore in services/workers; SalesforceCore.AspNetCore for UI.
- Centralize token acquisition for background jobs; use managed identities where possible (e.g., store JWT keys/secrets in vaults).
- Use distributed caches for schema/token/session across instances.

## Reliability & Resilience
- Configure retries/backoff (`MaxRetries`, `RetryBaseDelay`, `TotalRequestTimeout`) to fit SLAs and org limits.
- Monitor 429 and limit endpoints via `ILimitsService`; alert on approaching thresholds.
- Use circuit breakers (enabled via standard resilience handler) to protect downstream.

## Deployment
- Pre-warm caches (schema, record types) after deploy if needed.
- Ensure preview NuGet feeds are available in CI for `10.0.0-*` dependencies.
- Keep API version consistent across services; plan upgrades per release window.

## Security & Compliance
- Enforce FLS and SOQL validation; audit Connected App scopes regularly.
- Store secrets in vaults (Key Vault, Secret Manager, etc.); rotate keys.
- TLS for caches; secure cookies (`ForceSecureCookie`), strict SameSite where possible.
- Log redaction for tokens/PII; structured logging for audit trails.

## Data Movement & Governance
- Use Bulk API for high-volume; Composite for transactional batches with dependencies.
- Respect data residency and retention; avoid exporting PII unless required.
- Implement deletion/archival strategies with `GetDeletedAsync` and bulk delete.

## Observability
- Centralize logs/metrics; capture request IDs and correlation IDs.
- Track latency, retry counts, bulk job durations, and API limit consumption.
- Add health endpoints that validate token retrieval and a lightweight query.

## Testing & Environments
- Sandbox-first; isolated test users; separate Connected Apps per environment.
- Use feature flags to toggle experimental endpoints; keep API versions pinned per env.

## Next Steps
- Security deep dive: [09-Security.md](09-Security.md).
- Bulk/Composite: [07-Bulk-Composite-Services.md](07-Bulk-Composite-Services.md).
- Infrastructure primitives: [16-Backbone-Infrastructure.md](16-Backbone-Infrastructure.md).
