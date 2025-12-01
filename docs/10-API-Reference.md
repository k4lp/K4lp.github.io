# API Reference (Core Surfaces)

High-level reference for primary public interfaces. See code for full signatures.

## IDataService
- SOQL: `QueryAsync`, `QueryNextAsync`, `QueryAllAsync`, `QueryAllAsyncEnumerable`.
- CRUD: `GetRecordAsync`, `CreateRecordAsync`, `UpdateRecordAsync`, `DeleteRecordAsync`.
- Paging: `QueryPagedAsync`.
- Lookups: `HydrateLookupsAsync`, `ResolveLookupAsync`, `BatchResolveLookupAsync`.
- Files: `GetAttachedFilesAsync`, `UploadFileAsync` (bytes/stream), `DeleteFileAsync`.
- Upsert: `UpsertRecordAsync`.
- Batch helpers: `BatchCreateAsync`, `BatchUpdateAsync`, `BatchUpsertAsync`, `BatchDeleteAsync`.

## ITypedDataService
- LINQ entry: `Query<T>()`.
- CRUD: `GetByIdAsync`, `GetAsync`, `GetAllAsync`, `CreateAsync`, `UpdateAsync`, `DeleteAsync`, `UpsertAsync`.

## ISchemaService
- Metadata: `GetDescribeAsync`, `GetFieldMapAsync`, `GetNameFieldAsync`.
- Field lists: `GetCreateableFieldsAsync`, `GetUpdateableFieldsAsync`, `GetQueryableFieldsAsync`, `SanitizeFieldListAsync`.
- Polymorphic: `ResolvePolymorphicTypeAsync`, `BatchResolvePolymorphicTypesAsync`.

## IBulkService
- Jobs: `CreateJobAsync`, `UploadJobDataAsync`, `CloseJobAsync`, `AbortJobAsync`, `DeleteJobAsync`, `WaitForCompletionAsync`, `GetJobAsync`, `GetAllJobsAsync`.
- Results: `GetSuccessfulResultsAsync`, `GetFailedResultsAsync`, `GetUnprocessedRecordsAsync`.
- High-level ops: `InsertAsync`, `UpdateAsync`, `UpsertAsync`, `DeleteAsync`.
- Bulk Query: `CreateQueryJobAsync`, `GetQueryResultsAsync`, `QueryAsync`.

## ICompositeService
- Collections: create/update/upsert/delete batches with optional `allOrNone`.
- Graph: `ExecuteGraphAsync` with `GraphRequestBuilder`.

## Tooling/Search/Reports/Replication/Limits
- `IToolingService`: execute anonymous, query tooling, retrieve Apex classes/logs.
- `ISearchService`: SOSL search via raw string or fluent builder.
- `IReportService`: run analytics reports.
- `IReplicationService`: `GetUpdatedAsync`, `GetDeletedAsync`.
- `ILimitsService`: read API limits and warnings.

## ASP.NET Core Integration
- Services: `AddSalesforceCoreMvc`, `AddSalesforceAuthentication`.
- Routing: `MapSalesforceRoutes`.
- Token storage: `AddSalesforceSessionTokenStorage`, `AddSalesforceDistributedCacheTokenStorage`.
- Middleware: `UseSalesforceCore` (exception handling + static assets).
- Tag Helpers/Controllers: see [15-Tag-Helpers.md](15-Tag-Helpers.md).

## Configuration Objects
- `SalesforceOptions`: core settings (API version, retries, cache, limits).
- `SalesforceMvcOptions`: MVC/rendering options.
- `JwtTokenProviderOptions`: JWT auth settings.
- `ClientCredentialsOptions`: client credentials settings.

## Next Steps
- Detailed config: [03-Configuration.md](03-Configuration.md).
- Auth: [02-Authentication.md](02-Authentication.md).
- Data APIs: [04-Data-Service.md](04-Data-Service.md), [05-Typed-Data-Service.md](05-Typed-Data-Service.md).
