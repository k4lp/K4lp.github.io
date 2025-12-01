# Additional Services

Supporting services beyond core CRUD and bulk operations.

## Search (`ISearchService`)
- SOSL search via raw string or fluent builder.
- Example:
```csharp
var results = await searchService.Search("Acme")
    .In(SearchScope.AllFields)
    .Returning("Account", new[] { "Id", "Name" })
    .WithLimit(25)
    .ExecuteAsync();
```

## Limits (`ILimitsService`)
- Read API limits and warnings.
- Example:
```csharp
var warnings = await limitsService.CheckLimitsAsync(80);
```

## Replication (`IReplicationService`)
- Change tracking via `GetUpdatedAsync` and `GetDeletedAsync`.
- Example:
```csharp
var windowStart = DateTime.UtcNow.AddHours(-1);
var updated = await replicationService.GetUpdatedAsync("Account", windowStart, DateTime.UtcNow);
```

## Tooling (`IToolingService`)
- Execute anonymous Apex, query tooling objects, fetch debug logs, manage Apex classes.
- Example:
```csharp
var result = await toolingService.ExecuteAnonymousAsync("System.debug('hi');");
```

## Reports/Analytics (`IReportService`)
- Run reports and retrieve results programmatically.
- Example:
```csharp
var report = await reportService.RunAsync("00OXXXXXXXXXXXX");
```

## Apex REST (`IApexService`)
- Call custom Apex REST endpoints with strongly-typed helpers.
- Example:
```csharp
var response = await apexService.PostAsync<MyResponse>("MyNamespace/MyEndpoint", payload);
```

## Next Steps
- Core data: [04-Data-Service.md](04-Data-Service.md).
- Typed LINQ: [05-Typed-Data-Service.md](05-Typed-Data-Service.md).
- Security: [09-Security.md](09-Security.md).
