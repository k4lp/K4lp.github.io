# Bulk & Composite Services

High-volume and batched operations: Bulk API 2.0 (`IBulkService`) and Composite API (`ICompositeService`).

## Requirements
- **Required**: Authenticated client; `Salesforce` config; .NET 10.
- **Recommended**: Tune `BulkPollInterval` and `BulkJobTimeout`; ensure retry/backoff aligns with org limits.
- **Optional**: Distributed cache for schema validation before bulk uploads.

## Bulk API 2.0 (`IBulkService`)
Use for large datasets and CSV payloads.

### Typical Insert
```csharp
var job = await bulkService.InsertAsync("Account", records);
```

### Full Control
```csharp
var create = await bulkService.CreateJobAsync(new CreateBulkJobRequest
{
    ObjectName = "Lead",
    Operation = BulkOperation.insert,
    ContentType = BulkContentType.CSV
});

await bulkService.UploadJobDataAsync(create.Id, csvData);
await bulkService.CloseJobAsync(create.Id);
var result = await bulkService.WaitForCompletionAsync(create.Id);
var successCsv = await bulkService.GetSuccessfulResultsAsync(create.Id);
```

### Query Jobs
```csharp
var job = await bulkService.CreateQueryJobAsync(new CreateBulkQueryRequest
{
    Query = "SELECT Id, Name FROM Account",
    Operation = BulkOperation.query
});
var resultsCsv = await bulkService.GetQueryResultsAsync(job.Id);
```

### Notes
- CSV must be RFC 4180 compliant.
- Respect `MaxFileUploadSize` and org bulk limits.
- Job timeouts use `BulkJobTimeout`; polling uses `BulkPollInterval`.

## Composite API (`ICompositeService`)
Use for small/medium batches or when you need partial success handling without bulk CSV.

### Example: Upsert batch
```csharp
var responses = await compositeService.UpsertAsync(
    "Contact",
    "External_Id__c",
    records,
    allOrNone: false);
```

### Composite Graph
```csharp
var graph = new GraphRequestBuilder()
    .AddGraph("createRecords")
        .AddNode("newAccount", "Account", CompositeMethod.POST, new { Name = "Acme" })
        .AddNode("newContact", "Contact", CompositeMethod.POST,
            new { FirstName = "Ada", LastName = "Lovelace", AccountId = "@{newAccount.id}" })
        .WithDependency("newContact", "newAccount")
    .Build();

var response = await compositeService.ExecuteGraphAsync(graph);
```

### When to Choose Composite
- Batching up to 25 sub-requests where sequencing or mixed verbs matter.
- Graph operations with dependencies up to 500 nodes per graph.
- Avoid CSV and want JSON payloads with immediate responses.

## Safety & Limits
- Bulk: watch API limits, file sizes, and job timeouts; handle 429 via configured retries.
- Composite: cap at 25 sub-requests per batch; handle partial failures via response parsing.
- Validate createable/updateable fields before sending to either API.

## Next Steps
- Data service for smaller workloads: [04-Data-Service.md](04-Data-Service.md).
- Typed LINQ usage: [05-Typed-Data-Service.md](05-Typed-Data-Service.md).
- Security considerations: [09-Security.md](09-Security.md).
