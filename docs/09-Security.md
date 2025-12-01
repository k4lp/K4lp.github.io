# Security

Guidance for securing SalesforceCore usage end-to-end.

## Principles
- Least privilege in Salesforce (profiles/permission sets).
- Validate and sanitize client input.
- Protect tokens and secrets; prefer short-lived access.

## Required Settings
- `EnforceFieldLevelSecurity = true` (default).
- `ValidateSoqlInputs = true` (default).
- HTTPS everywhere; secure cookies in production.

## Authentication Hardening
- PKCE for web apps; avoid embedding client secrets in browsers.
- JWT/Client Credentials: store secrets/keys in secure stores; rotate keys regularly.
- Use `ForceSecureCookie`, `SlidingExpiration`, and `SessionCookieName` to control session behavior.

## SOQL Safety
- Use LINQ/typed queries where possible.
- When building SOQL strings, sanitize inputs via `SecurityUtils.SanitizeSoqlLike` / `SecurityUtils.SanitizeSoql`.
- Sanitize field lists with `ISchemaService.SanitizeFieldListAsync`.

## Field-Level Security & Schema
- Honor createable/updateable/readable flags before writes.
- Use `ISchemaService` to verify field access and types before rendering UI or sending data.

## Files
- Enforce `MaxFileUploadSize` and `AllowedFileExtensions`.
- Validate content type server-side; scan files if required by policy.

## Tokens & Sessions
- Web: prefer distributed cache token storage for multi-node deployments.
- Workers: keep access tokens in memory only; avoid persisting to disk.
- Revoke tokens on logout when possible (`ITokenProvider.RevokeTokenAsync`).

## Logging
- Avoid logging access tokens, refresh tokens, or PII.
- Enable debug logging only in non-production; scrub sensitive fields from logs.

## Network & Resilience
- Configure retry limits to avoid hammering org limits; handle 429 gracefully.
- Respect `TotalRequestTimeout` and circuit breakers to prevent overload.

## Compliance Checklist
- Secure storage for secrets/keys.
- TLS termination with HSTS.
- Audit Connected App settings regularly (scopes, IP policies, refresh token policies).
- Monitor Salesforce event logs and API limits.

## Next Steps
- Configuration reference: [03-Configuration.md](03-Configuration.md).
- Auth setup: [02-Authentication.md](02-Authentication.md).
