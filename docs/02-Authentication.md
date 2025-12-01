# Authentication

How SalesforceCore handles auth across web apps and background services on .NET 10. Choose the flow that matches your host and register the correct token provider + HttpClients.

## Audience & Scope
- **Audience**: Developers wiring authentication in ASP.NET Core or workers.
- **Covers**: PKCE (web), JWT, Client Credentials, token storage, required services.

## Requirements
- **Required**: Connected App with OAuth scopes `openid`, `profile`, `email`, `api`; add `refresh_token` for web apps.
- **Recommended**: PKCE for interactive apps; Redis-backed token/session storage in production.
- **Optional**: Client Credentials flow for headless services; JWT flow for service accounts; preview feed access for `10.0.0-*` dependencies.

## Flows at a Glance
- **PKCE (Web)**: Secure for browsers; no client secret; uses `AddSalesforceAuthentication`.
- **JWT (Server-to-Server)**: Uses certificate + pre-authorized user; `JwtTokenProvider`.
- **Client Credentials (Server-to-Server)**: Uses client secret; requires Connected App enabling Client Credentials; `ClientCredentialsTokenProvider`.

## PKCE (ASP.NET Core)
```csharp
using SalesforceCore.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSalesforceCoreMvc(builder.Configuration);
builder.Services.AddSalesforceAuthentication(builder.Configuration);
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession();
```

appsettings.json:
```json
{
  "Salesforce": {
    "ClientId": "YOUR_CONNECTED_APP_CONSUMER_KEY",
    "Domain": "https://login.salesforce.com",
    "CallbackPath": "/salesforce/callback"
  }
}
```

Token storage options:
- Default cookie tokens via `AddSalesforceAuthentication`.
- `AddSalesforceSessionTokenStorage()` for ASP.NET Core session.
- `AddSalesforceDistributedCacheTokenStorage()` for Redis-backed multi-node storage.

## JWT Bearer Flow (Workers/Jobs)
```csharp
using SalesforceCore.Extensions;
using SalesforceCore.Services.Core;

services.AddSalesforceCore(configuration);
services.AddHttpClient("SalesforceJwt");
services.AddScoped<ITokenProvider, JwtTokenProvider>();
```

appsettings.json fragment:
```json
{
  "Salesforce": {
    "ClientId": "YOUR_CONNECTED_APP_CONSUMER_KEY",
    "Domain": "https://login.salesforce.com"
  },
  "SalesforceJwt": {
    "Username": "integration-user@company.com",
    "PrivateKeyPath": "/path/to/private.key",
    "Audience": "https://login.salesforce.com"
  }
}
```

Connected App checklist:
- Upload certificate; set “Admin approved users are pre-authorized”; add users/profiles.

## Client Credentials Flow (Workers/Jobs)
```csharp
using SalesforceCore.Extensions;
using SalesforceCore.Services.Core;

services.AddSalesforceCore(configuration);
services.AddHttpClient("SalesforceClientCredentials");
services.AddScoped<ITokenProvider, ClientCredentialsTokenProvider>();
```

Config:
```json
{
  "Salesforce": {
    "ClientId": "YOUR_CONNECTED_APP_CONSUMER_KEY",
    "ClientSecret": "YOUR_CONNECTED_APP_CONSUMER_SECRET",
    "Domain": "https://login.salesforce.com"
  }
}
```

Connected App checklist:
- Enable “Client Credentials Flow”; assign a “Run As” user or permission set; ensure scopes include `api`.

## Token Refresh & Revoke
- PKCE: `AspNetCoreTokenProvider` auto-refreshes with refresh_token; ensure `AddSalesforceAuthentication` is registered.
- JWT: Refresh = obtain new assertion; provider handles renewal; revoke best-effort.
- Client Credentials: No refresh token; provider requests new access tokens on demand.

## Common Pitfalls
- **Missing HttpClient**: Register `AddHttpClient("SalesforceJwt")` or `AddHttpClient("SalesforceClientCredentials")` when using those providers.
- **401/invalid_client**: Verify Consumer Key/Secret, callback URL, enabled flow, and user access to the Connected App.
- **Stale instance URL**: Ensure token provider updates `instance_url`; for PKCE, cookies/session must persist.

## Next Steps
- See config knobs in [03-Configuration.md](03-Configuration.md).
- Review security posture in [09-Security.md](09-Security.md).
