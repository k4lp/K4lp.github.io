# Custom MVC Guide

How to build bespoke ASP.NET Core MVC experiences with SalesforceCore.AspNetCore.

## Requirements
- **Required**: SalesforceCore + SalesforceCore.AspNetCore packages; PKCE auth configured.
- **Recommended**: Distributed cache token storage; HTMX enabled for partials.
- **Optional**: Custom layout/static assets via MVC options.

## Register Services
```csharp
using SalesforceCore.AspNetCore.Extensions;

builder.Services.AddSalesforceCoreMvc(builder.Configuration);
builder.Services.AddSalesforceAuthentication(builder.Configuration);
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession();
```

## Use Built-in Controllers (optional)
```csharp
app.MapSalesforceRoutes(routePrefix: "sf");
```
- Routes: `/{prefix}/{sObject}` (list), `/{prefix}/{sObject}/Details/{id}`, `Create`, `Edit`, `Delete`, `Upload`.
- Good for admin-style CRUD; replace with custom controllers for bespoke flows.

## Tag Helpers Highlights
- `sf-lookup` – AJAX-powered lookup fields.
- `sf-picklist` – Dynamic picklists with record type support.
- `sf-model-form` – Quick form scaffolding from metadata.
- See [15-Tag-Helpers.md](15-Tag-Helpers.md) for details.

## Custom Controllers
Inherit from your own controllers, inject services you need:
```csharp
public class OpportunitiesController : Controller
{
    private readonly ITypedDataService _data;
    public OpportunitiesController(ITypedDataService data) => _data = data;

    public async Task<IActionResult> Index()
    {
        var items = await _data.Query<Opportunity>()
            .OrderByDescending(o => o.CreatedDate)
            .Take(50)
            .ToListAsync();
        return View(items);
    }
}
```

## Custom Views
- Combine tag helpers with your layout; override CSS/JS via `SalesforceMvcOptions.CustomStylePath/CustomScriptPath`.
- Use partials for HTMX responses (`HX-Request` header).

## File Uploads
- Ensure `EnableFileUploads` is true; respect `MaxFileUploadSize` and `AllowedFileExtensions`.
- Use `FileController` routes (`/{prefix}/file/...`) or call `IDataService.UploadFileAsync`.

## Validation
- Use `[SalesforceValidate]` attribute to apply validation engine before actions.
- Keep `EnforceFieldLevelSecurity` enabled to avoid leaking unauthorized fields.

## Layout & Assets
- Embedded assets served at `/_salesforce` (configurable via `SalesforceMvcOptions.StaticFilesPath`).
- Set `UseEmbeddedViews/UseEmbeddedStaticFiles` to false to supply your own.

## Next Steps
- Tag helpers reference: [15-Tag-Helpers.md](15-Tag-Helpers.md).
- Tutorial walk-through: [12-Tutorial-MVC-CRUD-App.md](12-Tutorial-MVC-CRUD-App.md).
