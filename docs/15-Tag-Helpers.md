# Tag Helpers (SalesforceCore.AspNetCore)

UI building blocks for MVC views.

## Requirements
- Add `SalesforceCore.AspNetCore` and call `AddSalesforceCoreMvc` + `AddSalesforceAuthentication`.
- Ensure `_ViewImports.cshtml` includes `@addTagHelper *, SalesforceCore.AspNetCore`.

## Lookup (`sf-lookup`)
- Purpose: AJAX search + select for lookup fields.
- Attributes:
  - `asp-for`: bound property.
  - `sf-object`: target object API name.
  - `sf-display-field` (optional): display field override.
  - `sf-placeholder` (optional): placeholder text.

Example:
```html
<sf-lookup asp-for="AccountId" sf-object="Account" sf-placeholder="Search accounts..." />
```

## Picklist (`sf-picklist`)
- Purpose: Render picklists with record type awareness.
- Attributes:
  - `asp-for`: bound property.
  - `sf-object`: target object.
  - `sf-record-type-id` (optional): record type context.

Example:
```html
<sf-picklist asp-for="Industry" sf-object="Account" class="form-select"></sf-picklist>
```

## Model Form (`sf-model-form`)
- Purpose: Rapid form scaffolding from metadata.
- Attributes:
  - `asp-for`: model instance.
  - `sf-object`: object API name.
  - `sf-columns` (optional): column count.

Example:
```html
<sf-model-form asp-for="Model" sf-object="Contact" sf-columns="2"></sf-model-form>
```

## Notes
- Honors FLS and createable/updateable flags.
- Works with HTMX partials; detects `HX-Request`.
- Uses embedded CSS/JS unless overridden via `SalesforceMvcOptions.CustomStylePath/CustomScriptPath`.

## Next Steps
- Custom MVC usage: [12-Custom-MVC-Guide.md](12-Custom-MVC-Guide.md).
- MVC tutorial: [12-Tutorial-MVC-CRUD-App.md](12-Tutorial-MVC-CRUD-App.md).
