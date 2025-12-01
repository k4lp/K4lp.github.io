# Data Service (`IDataService`)

Dynamic CRUD, SOQL, files, and batch helpers built on the core client. Use this when you don’t need strongly-typed LINQ.

## Scope & Requirements
- **Audience**: Developers doing dynamic or metadata-driven operations.
- **Requires**: Working `ITokenProvider`, configured `Salesforce` section, .NET 10.
- **Recommended**: `ValidateSoqlInputs` enabled; distributed cache for schema lookups.

## Common Usage
Resolve from DI:
```csharp
public class AccountReader
{
    private readonly IDataService _data;
    public AccountReader(IDataService data) => _data = data;

    public Task<QueryResult> GetTopAccountsAsync() =>
        _data.QueryAsync("SELECT Id, Name FROM Account ORDER BY CreatedDate DESC LIMIT 10");
}
```

### CRUD
```csharp
var id = await dataService.CreateRecordAsync("Account", new Dictionary<string, object?>
{
    ["Name"] = "Acme",
    ["Industry"] = "Technology"
});

await dataService.UpdateRecordAsync("Account", id, new Dictionary<string, object?> { ["Industry"] = "Finance" });
await dataService.DeleteRecordAsync("Account", id);
```

### Paging
```csharp
var page = await dataService.QueryPagedAsync(
    sObject: "Contact",
    fields: new[] { "Id", "FirstName", "LastName", "Email" },
    whereClause: "Email LIKE '%@example.com%'",
    orderBy: "CreatedDate",
    descending: true,
    page: 1,
    pageSize: 25);
```

### Follow NextRecordsUrl
```csharp
var first = await dataService.QueryAsync("SELECT Id, Name FROM Account");
if (!first.Done && !string.IsNullOrEmpty(first.NextRecordsUrl))
{
    var next = await dataService.QueryNextAsync(first.NextRecordsUrl);
}
```

### Hydrate Lookups
```csharp
var describe = await schemaService.GetDescribeAsync("Contact");
var lookupFields = describe.Fields.Where(f => f.IsLookup);
var hydrated = await dataService.HydrateLookupsAsync(record, lookupFields);
```

### Files
```csharp
var fileId = await dataService.UploadFileAsync(recordId, "spec.pdf", fileBytes);
var files = await dataService.GetAttachedFilesAsync(recordId);
await dataService.DeleteFileAsync(files.First().ContentDocumentId);
```

## Validation & Safety
- Field lists are sanitized against schema; upsert/update respect createable/updateable flags.
- SOQL strings should be sanitized via `SecurityUtils.SanitizeSoqlLike` when building manually.
- Page sizes are clamped by `Salesforce:MaxPageSize`.

## When to Use Something Else
- Need LINQ and strong typing: use `ITypedDataService` ([05-Typed-Data-Service.md](05-Typed-Data-Service.md)).
- Need Bulk/Composite orchestration: see [07-Bulk-Composite-Services.md](07-Bulk-Composite-Services.md).

## Next Steps
- Schema helpers: [06-Schema-Service.md](06-Schema-Service.md).
- Typed API: [05-Typed-Data-Service.md](05-Typed-Data-Service.md).
