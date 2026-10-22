# Task: Implement Master Data Modules for a Nuxt Store Management Application

## 1. Project Context

Develop the initial Master Data modules for a store management application using the existing Nuxt project.

Implement only these five modules:

1. Product
2. Category
3. Brand
4. Unit
5. Supplier

Other modules, such as Inventory, Sales, Purchases, POS, Reports, Expenses, and Warehouse Management, will be implemented incrementally in future tasks.

Do not implement those future modules now. However, design the current architecture so that additional modules can be added without major refactoring.

## 2. Technology Stack

Follow the existing project configuration and use:

- Nuxt with Vue 3 Composition API.
- TypeScript with strict typing.
- Tailwind CSS.
- Prisma ORM for database access, if Prisma is already configured or is the project's chosen ORM.
- The existing database provider and connection configuration.
- Nuxt server API routes for backend operations.
- Zod for runtime validation if already installed or if an additional validation dependency is approved.
- ESLint and Prettier according to the existing project setup.

Before making changes, inspect the project and identify its Nuxt version, `srcDir`, installed dependencies, database configuration, authentication setup, and existing coding conventions.

Do not replace existing configuration unnecessarily. Do not introduce a second ORM or authentication system.

## 3. Mandatory Coding Conventions

### 3.1 Arrow Functions

Use arrow functions for application functions.

Preferred:

```ts
const getProducts = async () => {
  // Implementation
};
```

Avoid traditional function declarations unless required by a framework or library.

Use explicit parameter and return types where appropriate.

### 3.2 Type Definitions

Store shared interfaces and types in a dedicated `types/` directory.

Example:

```text
types/
├── index.ts
├── product/
│   ├── index.ts
│   └── product.ts
├── category/
│   ├── index.ts
│   └── category.ts
├── brand/
│   ├── index.ts
│   └── brand.ts
├── unit/
│   ├── index.ts
│   └── unit.ts
└── supplier/
    ├── index.ts
    └── supplier.ts
```

Rules:

- Do not define shared interfaces or types directly inside Vue components.
- Avoid duplicate definitions.
- Use `import type` for type-only imports.
- Use Prisma-generated types where appropriate, but do not expose database model types indiscriminately as public API contracts.
- Define separate create, update, query, and response types when their requirements differ.
- Use `unknown` instead of `any`.
- Do not bypass type errors using `as any`.

### 3.3 Barrel Exports

Every manually maintained module directory that exposes reusable code must have an `index.ts` where appropriate.

Example:

```ts
// types/product/index.ts
export * from "./product";
```

```ts
// types/index.ts
export * from "./product";
export * from "./category";
export * from "./brand";
export * from "./unit";
export * from "./supplier";
```

Apply the same principle to `utils/`, `composables/`, and reusable component modules.

Do not create unnecessary barrel files in Nuxt framework-managed directories such as `pages/` and `server/api/`.

Avoid circular imports and excessive re-export chains.

### 3.4 Import Aliases

Prefer the Nuxt alias `~/` for application source imports.

Preferred:

```ts
import { formatCurrency } from "~/utils";
import type { Product } from "~/types";
import BaseSelect from "~/components/form/BaseSelect.vue";
```

Avoid deeply nested relative imports when a configured alias is available.

Verify the actual Nuxt source directory and alias configuration before implementing imports.

### 3.5 Utilities

Put generic reusable functions in `utils/`.

Examples:

- `formatCurrency`
- `formatDate`
- `formatNumber`
- Generic formatting and validation helpers

Do not place database access or module-specific business logic in generic utilities.

### 3.6 Vue Components

Use:

```vue
<script setup lang="ts"></script>

<template></template>
```

Use typed props and events. Keep components focused, reusable, and easy to maintain.

Use the existing shared form components if available. Do not duplicate existing UI components.

## 4. Project Architecture

Inspect the current project before choosing the final file structure.

Prefer an organization similar to:

```text
components/
├── form/
│   └── ...
└── admin/
    └── master-data/
        ├── ProductForm.vue
        ├── CategoryForm.vue
        ├── BrandForm.vue
        ├── UnitForm.vue
        └── SupplierForm.vue

composables/
├── index.ts
├── useProducts.ts
├── useCategories.ts
├── useBrands.ts
├── useUnits.ts
└── useSuppliers.ts

types/
├── index.ts
├── product/
├── category/
├── brand/
├── unit/
└── supplier/

utils/
├── index.ts
└── format/
    ├── index.ts
    ├── currency.ts
    └── date.ts

server/
├── api/
│   ├── products/
│   ├── categories/
│   ├── brands/
│   ├── units/
│   └── suppliers/
├── services/
└── utils/

pages/
└── admin/
    └── master-data/
        ├── products/
        ├── categories/
        ├── brands/
        ├── units/
        └── suppliers/
```

This is a proposed structure, not a requirement to duplicate files that already exist.

Adapt file names and locations to existing project conventions and Nuxt routing rules.

Keep UI, request handling, validation, business logic, and database access appropriately separated.

## 5. Master Data: Product

Implement complete CRUD functionality for products.

### Product fields

- `id`: primary identifier.
- `sku`: unique stock-keeping unit.
- `barcode`: optional unique barcode.
- `name`: product name.
- `description`: optional description.
- `categoryId`: category relation.
- `brandId`: optional brand relation, if the business permits unbranded products.
- `unitId`: unit relation.
- `purchasePrice`: purchase price.
- `sellingPrice`: selling price.
- `image`: optional product image reference.
- `isActive`: active/inactive status.
- `createdAt`: creation timestamp.
- `updatedAt`: last update timestamp.

Use suitable database types for money and quantities. Avoid floating-point database types for monetary values; prefer an appropriate Prisma `Decimal` representation when supported by the selected database.

Rules:

- SKU must be unique.
- Barcode must be unique when provided.
- Product name is required.
- Category and unit must reference existing records.
- Brand is optional unless existing business requirements specify otherwise.
- Prices must be non-negative.
- Validate relationships on the server.
- Use pagination and search for product listings.
- Support filtering by category, brand, unit, and status where appropriate.
- Display related category, brand, and unit names in the product table.
- Do not allow the deletion of a product that is referenced by existing business records.
- Use an appropriate archival or inactive status when hard deletion is unsafe.

### Product UI

Provide:

- Product list table.
- Search by product name, SKU, or barcode.
- Pagination.
- Create product form.
- Edit product form.
- Product detail view only if it fits the existing routing conventions and task scope.
- Delete confirmation dialog.
- Active/inactive status indicator.
- Empty, loading, validation-error, and request-error states.

Use shared select components for category, brand, and unit relations.

If image uploads are supported, store uploaded files using the project's existing upload conventions. Do not use arbitrary external image URLs as a substitute for uploaded files.

## 6. Master Data: Category

Implement complete CRUD functionality.

### Fields

- `id`
- `name`
- `slug`, if appropriate for the project.
- `description`, optional.
- `isActive`
- `createdAt`
- `updatedAt`

Rules:

- Category name is required.
- Prevent duplicate category names according to a consistent case-normalization policy.
- Generate a slug if the project requires one.
- Do not allow deletion when the category is referenced by products unless a safe reassignment or archival strategy is implemented.
- Support search, pagination, and status filtering when appropriate.

### UI

- Category table.
- Create and edit form.
- Delete confirmation.
- Search and status filtering.
- Clear validation and error messages.

## 7. Master Data: Brand

Implement complete CRUD functionality.

### Fields

- `id`
- `name`
- `description`, optional.
- `logo`, optional.
- `isActive`
- `createdAt`
- `updatedAt`

Rules:

- Brand name is required.
- Prevent duplicate brand names.
- Brand logo is optional.
- Prevent unsafe deletion when referenced by products.
- Allow products without a brand if that is consistent with the product schema.

### UI

- Brand list.
- Create and edit form.
- Optional logo upload if supported by the project.
- Search and status filtering.
- Delete confirmation.

## 8. Master Data: Unit

Implement complete CRUD functionality.

### Fields

- `id`
- `name`
- `symbol`
- `description`, optional.
- `isActive`
- `createdAt`
- `updatedAt`

Examples:

- Piece — `pcs`
- Box — `box`
- Kilogram — `kg`
- Gram — `g`
- Liter — `L`
- Milliliter — `mL`

Rules:

- Unit name and symbol are required.
- Prevent duplicate unit names and symbols according to a consistent normalization policy.
- Prevent unsafe deletion when the unit is referenced by products.
- Do not implement unit conversion in this initial scope unless the existing project already requires it.

### UI

- Unit table.
- Create and edit form.
- Search and status filtering.
- Delete confirmation.

## 9. Master Data: Supplier

Implement complete CRUD functionality.

### Fields

- `id`
- `code`: unique supplier code, if supplier codes are used.
- `name`
- `contactPerson`, optional.
- `email`, optional.
- `phone`, optional.
- `address`, optional.
- `notes`, optional.
- `isActive`
- `createdAt`
- `updatedAt`

Rules:

- Supplier name is required.
- Supplier code must be unique when provided.
- Validate email format when an email is provided.
- Phone number must be stored as a string, not a numeric value.
- Do not implement purchase orders or supplier payment transactions yet.
- Keep the schema ready for a future purchase module.
- Prevent deletion when the supplier is referenced by future business transactions; prefer archival when necessary.

### UI

- Supplier list.
- Create and edit form.
- Search by supplier name, code, phone, or email.
- Optional status filtering.
- Delete confirmation.
- Clear validation and error states.

## 10. Database Schema and Relations

Implement the Prisma schema for the five master data modules.

Required relationships:

- One Category can have many Products.
- One Brand can have many Products.
- One Unit can have many Products.
- Products must reference a Category and a Unit.
- Products may optionally reference a Brand.
- Supplier remains independent in this phase because purchase transactions are not implemented yet.

Use appropriate primary keys, unique constraints, indexes, relation names, and deletion policies.

Rules:

- Prefer explicit relation constraints.
- Avoid cascading deletion of master records that could invalidate business history.
- Use database constraints for uniqueness wherever supported.
- Do not store category, brand, or unit names redundantly inside product records.
- Preserve existing database data and schema conventions.
- Do not run destructive database resets.
- If schema changes are required, create an appropriate migration.
- Do not assume that a migration has been applied unless it has actually been executed.

## 11. Server API

Implement the required CRUD API endpoints for all five modules.

Use Nuxt server routes and HTTP method conventions.

Example product endpoints:

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`

Provide equivalent endpoints for categories, brands, units, and suppliers.

### API requirements

- Validate query parameters, request bodies, and identifiers.
- Implement pagination for collection endpoints.
- Support search and relevant filters.
- Return consistent response formats.
- Use correct HTTP status codes.
- Return appropriate validation and conflict errors.
- Handle not-found records.
- Handle duplicate unique fields gracefully.
- Prevent invalid foreign-key references.
- Keep database operations on the server.
- Do not expose database credentials or internal stack traces.
- Avoid trusting client-side validation alone.

Do not add authentication or authorization infrastructure if the project does not have one without first inspecting the current setup. If authentication already exists, protect these administrative endpoints according to the project's authorization model.

## 12. Frontend Data Handling

Use Nuxt's existing data-fetching conventions.

- Use `useFetch` or `useAsyncData` for suitable page-level data fetching.
- Use `$fetch` for imperative create, update, and delete operations where appropriate.
- Use typed request and response data.
- Keep API error handling consistent.
- Refresh or invalidate affected data after successful mutations.
- Avoid unnecessary duplicate requests.
- Do not place database queries in Vue components.
- Use composables for reusable client-side data-handling logic when beneficial.
- Do not duplicate business rules between frontend and backend as a substitute for server validation.

## 13. UI and UX Requirements

Create a simple, clean, responsive admin interface.

- Follow the project's existing layout and visual style.
- Use Tailwind CSS and existing shared components.
- Keep navigation consistent across all five modules.
- Use a shared table component when appropriate.
- Use shared form components for common inputs.
- Use a reusable confirmation dialog if one exists.
- Provide loading indicators and disabled states during mutations.
- Prevent accidental repeated submissions.
- Display understandable success and error feedback.
- Ensure forms are keyboard accessible.
- Use appropriate labels and validation messages.
- Avoid unnecessary animations, decorative dashboards, and overly complex UI.
- Do not add statistics cards or dashboard widgets unless explicitly requested.

If a reusable `BaseSelect.vue` already exists, use it for category, brand, and unit fields. Extend it only if necessary, without breaking existing usage.

## 14. Security and Validation

- Validate every mutation on the server.
- Treat all client input as untrusted.
- Validate uploaded file size, type, and destination if uploads are implemented.
- Keep secrets in server-only configuration.
- Do not expose internal exception details.
- Do not permit unauthorized mutations.
- Do not use `any` to bypass security-sensitive type checks.
- Prevent invalid data from being inserted through direct API calls.

## 15. Scope Boundaries

Implement only:

- Product
- Category
- Brand
- Unit
- Supplier

Do not implement:

- Inventory movement and stock transactions.
- Stock opname.
- Purchase orders.
- Sales and POS.
- Payments.
- Customer management.
- Accounting.
- Expenses.
- Multi-warehouse operations.
- Advanced reporting.
- Product variant management unless the existing project already requires it.

Do not create fake implementations for future features.

Keep the schema extensible for later modules without prematurely introducing unnecessary abstractions.

## 16. Implementation Workflow

Follow these steps in order:

1. Inspect the existing project structure and configuration.
2. Review the existing `AGENTS.md`, if present.
3. Identify reusable layouts, tables, form components, selects, dialogs, and utilities.
4. Inspect the current Prisma schema and database configuration.
5. Review existing API conventions and authentication requirements.
6. Propose the minimal required schema and file changes.
7. Implement the five master data modules.
8. Implement validation and CRUD API endpoints.
9. Implement the frontend tables and forms.
10. Add or update shared types and barrel exports.
11. Verify imports, TypeScript types, and Nuxt conventions.
12. Run available linting, type checking, and relevant tests.
13. Review the final diff for unrelated or destructive changes.

Do not rewrite the whole project or replace existing components without justification.

## 17. Completion Report

After implementation, provide a concise report containing:

- Files created and modified.
- Database models and relations added.
- API endpoints implemented.
- Frontend pages and components implemented.
- Validation and security measures included.
- Commands executed and their actual results.
- Migration status.
- Any remaining limitations or manual steps.

Do not claim that migrations, tests, or type checks succeeded unless they were actually executed and completed successfully.

The final implementation must follow the existing project conventions and remain easy to extend with future store management modules.
