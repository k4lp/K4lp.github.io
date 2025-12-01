# Comprehensive Codebase Analysis & Improvement Plan

## 1. Executive Summary
A rigorous analysis of the `SalesforceCore` backend services (`IDataService`, `ITypedDataService`, `ISchemaService`, `ILookupService`, `ISearchService`) confirms a robust, secure-by-default architecture. The core services actively enforce Field-Level Security (FLS) and Object Permissions at the data access layer.

**The primary gap is in the Presentation Layer.** While the backend *enforces* security (preventing unauthorized writes), the frontend (Razor Views) lacks the tools to *reflect* these permissions (hiding unauthorized elements), leading to a poor user experience (error messages instead of UI adaptation) and developer fatigue (repetitive boilerplate).

## 2. Service-Level Deep Dive

### 2.1. `ISchemaService` (Metadata & Security Authority)
*   **Status**: ✅ **Excellent**
*   **Role**: The foundation of the library's security model.
*   **Key Features**:
    *   Exposes `GetCreateableFieldsAsync`, `GetAccessibleFieldsAsync`, etc.
    *   Implements caching (`ICacheProvider`) to ensure permission checks are performant.
    *   Provides `SanitizeFieldListWithFlsAsync` to auto-filter invalid fields.
*   **Verdict**: Ready to support the proposed UI TagHelpers without modification.

### 2.2. `IDataService` (Untyped Data Access)
*   **Status**: ✅ **Solid**
*   **Role**: The low-level workhorse.
*   **Security**: proactively uses `ISchemaService` to filter fields before sending `Create`/`Update` requests to Salesforce. This ensures "Secure by Default" operations.
*   **Performance**: Intelligent switching between Composite and Bulk APIs (as noted in analysis).

### 2.3. `ITypedDataService` (Developer Experience)
*   **Status**: ⚠️ **Good but Incomplete**
*   **Role**: Strongly-typed wrapper for `IDataService`.
*   **Issues**:
    *   **Missing Features**: Lacks typed support for Batch operations and File handling.
    *   **Inefficiency**: `UpsertAsync` logic (Read-then-Write) is less efficient than native Salesforce upsert (using External ID).
*   **Recommendation**: Future work should focus on bringing feature parity with `IDataService`.

### 2.4. `ILookupService` (UI Component Support)
*   **Status**: ✅ **Good**
*   **Role**: Powers complex lookup UI components.
*   **Features**: Caching, client-side relevance scoring, and polymorphic search support.
*   **Security**: Respects field sanitization.

### 2.5. `ISearchService` (SOSL Full-Text Search)
*   **Status**: ✅ **Good**
*   **Role**: Wrapper for Salesforce Object Search Language (SOSL).
*   **Design**: Clean Builder pattern (`SoslBuilder`).
*   **Security**: Relies on Salesforce's native SOSL permission enforcement (which is standard).

## 3. The Action Plan: Presentation Layer Security

Since the backend is solid, our focus is strictly on enabling the **Presentation Layer** to consume `ISchemaService` easily.

### 3.1. New Enum: `AccessMode`
To standardize permission intents across the UI.
```csharp
public enum AccessMode { Read, Create, Update, Delete }
```

### 3.2. `SalesforcePermissionTagHelper` (`<sf-permission>`)
A container that conditionally renders content based on `ISchemaService` checks.

*   **Logic**:
    *   Inject `ISchemaService`.
    *   If `Object` only: Check `SObjectDescribe.Createable/Updateable/Deletable`.
    *   If `Field` specified: Check `SObjectField.Accessible/Createable/Updateable`.
    *   Cache results heavily to prevent rendering lag.

**Example Usage:**
```cshtml
<!-- Hides the entire form if user can't create Contacts -->
<sf-permission object="Contact" mode="Create">
    <form asp-action="Create">
        <!-- Hides input if user can't edit 'Email' -->
        <sf-permission field="Email" mode="Create">
            <input asp-for="Email" />
        </sf-permission>
    </form>
</sf-permission>
```

### 3.3. `SalesforceFieldHelper` (Future)
Extensions to `asp-for` that can automatically set `disabled` or `readonly` attributes instead of hiding elements, providing a better UX for "Read Only" fields.

## 4. Next Steps
1.  **Implement `AccessMode` Enum**.
2.  **Implement `SalesforcePermissionTagHelper`**.
3.  **Verify** with a test View that creates a form with restricted fields.
