# Typed Data Service (`ITypedDataService`)

LINQ-to-SOQL with strongly-typed models. Use when you have C# classes mapped to Salesforce objects.

## Requirements
- **Required**: Model classes with `[SalesforceObject]`, `[SalesforceField]`, etc.; configured `Salesforce` options; working `ITokenProvider`.
- **Recommended**: Keep models in a shared library; validate SOQL inputs enabled.
- **Optional**: Generate models via `sf-gen` (see [08-Model-Generator-CLI.md](08-Model-Generator-CLI.md)).

## Basics
Resolve from DI:
```csharp
public class AccountService
{
    private readonly ITypedDataService _data;
    public AccountService(ITypedDataService data) => _data = data;

    public Task<List<Account>> TopAsync() =>
        _data.Query<Account>()
             .OrderByDescending(a => a.CreatedDate)
             .Take(10)
             .ToListAsync();
}
```

## CRUD
```csharp
var id = await _data.CreateAsync(account);
account.Id = id;

await _data.UpdateAsync(account);
await _data.DeleteAsync<Account>(id);

var upsertId = await _data.UpsertAsync(account, externalIdField: "External_Id__c");
```

## Query Examples
```csharp
var contacts = await _data.Query<Contact>()
    .Where(c => c.Email.Contains("@example.com"))
    .OrderBy(c => c.LastName)
    .Skip(20)
    .Take(10)
    .ToListAsync();
```

## Mapping Attributes (common)
- `[SalesforceObject("Account")]` – maps class to object.
- `[SalesforceField("Name", Required = true, MaxLength = 255)]` – field mapping + constraints.
- `[SalesforceId]` – marks Id property.
- `[SalesforceExternalId]` – marks external ID.
- `[SalesforceLookup("Account", RelationshipName = "Parent")]` – lookup relationships.

## Validation & Safety
- SOQL generated from expressions respects property mappings; avoid string-based conditions.
- Paging operators (`Skip/Take`) translate to OFFSET/LIMIT.
- Null handling: fields with null values are omitted on create/update.

## When to Drop to `IDataService`
- Dynamic fields at runtime, polymorphic object names, or ad-hoc SOQL: use `IDataService` ([04-Data-Service.md](04-Data-Service.md)).

## Next Steps
- Schema helpers: [06-Schema-Service.md](06-Schema-Service.md).
- Bulk/Composite: [07-Bulk-Composite-Services.md](07-Bulk-Composite-Services.md).
