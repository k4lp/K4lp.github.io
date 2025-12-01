# Permission Handling Improvements for Custom Views

## 1. Executive Summary
The `SalesforceCore` library currently possesses a robust backend engine (`ISchemaService`) for retrieving Field-Level Security (FLS) and Object CRUD permissions. However, the `SalesforceCore.AspNetCore` presentation layer lacks high-level abstractions to easily consume this data.

Currently, developers building custom views must manually inject services and write repetitive imperative logic to enforce permissions. This document proposes a set of TagHelpers and HtmlHelpers to streamline this process, allowing for declarative permission enforcement directly in Razor views.

## 2. Current State Analysis

### 2.1 Existing Backend Capabilities
The `ISchemaService` (located in `src/SalesforceCore/Services/Metadata/ISchemaService.cs`) exposes all necessary permission data:
*   **Object Permissions**: `SObjectDescribe` contains `Createable`, `Updateable`, `Deletable`, `Queryable`.
*   **Field Permissions**: `SObjectField` contains `Accessible` (Read), `Createable` (Edit on Create), `Updateable` (Edit on Update).

### 2.2 The Developer Experience Gap
To implement a permission-aware form today, a developer must do this:

**The "Hard" Way (Current State):**
```cshtml
@inject ISchemaService SchemaService
@{
    var objectName = "Account";
    var describe = await SchemaService.GetDescribeAsync(objectName);
    var fields = await SchemaService.GetFieldMapAsync(objectName);
}

@* Check Object Create Permission *@
@if (describe.Createable)
{
    <form method="post">
        @* Check Field FLS *@
        @if (fields["Name"].Createable)
        {
            <input asp-for="Name" />
        }

        @if (fields["Industry"].Createable)
        {
            <input asp-for="Industry" />
        }
    </form>
}
```
This approach is verbose, prone to typo errors (magic strings), and mixes business logic with presentation.

## 3. Proposed Improvements

To solve this, we propose adding a **Permission TagHelper** suite to `SalesforceCore.AspNetCore`. This will allow developers to wrap UI elements in permission-aware containers.

### 3.1 New Enum: `AccessMode`
First, we define a clear enumeration for intent:
```csharp
public enum AccessMode
{
    Read,       // Checks Accessible / Queryable
    Create,     // Checks Createable
    Update,     // Checks Updateable
    Delete      // Checks Deletable (Object only)
}
```

### 3.2 The `sf-permission` TagHelper
A general-purpose container that suppresses its content if the user lacks the required permission.

**Proposed Usage:**

```cshtml
@* 1. Object-Level Checks *@
<sf-permission object="Account" mode="Create">
    <button type="submit">Create New Account</button>
</sf-permission>

@* 2. Field-Level Security (FLS) *@
<sf-permission object="Account" field="AnnualRevenue" mode="Read">
    <dt>Revenue</dt>
    <dd>@Model.AnnualRevenue</dd>
</sf-permission>

@* 3. Combined Context (Clean Forms) *@
<sf-permission object="Contact" mode="Update">
    <form asp-action="Edit">

        @* Only renders input if user can edit 'Email' *@
        <sf-permission field="Email" mode="Update">
            <label asp-for="Email"></label>
            <input asp-for="Email" class="form-control" />
        </sf-permission>

    </form>
</sf-permission>
```

### 3.3 Enhanced Input TagHelpers (Optional)
We could extend the standard `asp-for` behavior or create a `sf-for` helper that automatically sets `readonly` or disables the input based on FLS, rather than hiding it entirely.

```cshtml
@* Renders <input disabled> if user has Read but not Edit access *@
<sf-input asp-for="Industry" />
```

## 4. Implementation Plan

1.  **Create `AccessMode` Enum**: Define the standard permission types.
2.  **Implement `SalesforcePermissionTagHelper`**:
    *   **Target**: `<sf-permission>` element.
    *   **Dependencies**: Inject `ISchemaService`.
    *   **Logic**:
        *   Retrieve metadata for the specified Object/Field.
        *   Check the boolean flag corresponding to the `AccessMode`.
        *   If false, call `output.SuppressOutput()`.
3.  **Caching Strategy**: Ensure `ISchemaService` caching is leveraged to prevent metadata API calls on every render. The existing `SchemaService` already caches `GetDescribeAsync`, so this will be performant by default.

## 5. Benefits
*   **Safety**: Reduces the risk of accidentally exposing fields users shouldn't see.
*   **Productivity**: Removes boilerplate boilerplate code from Views.
*   **Maintainability**: Centralizes permission logic; if Salesforce permissions change, the UI adapts automatically without code changes.
