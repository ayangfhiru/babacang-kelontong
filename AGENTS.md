# AGENTS.md

## 1. General Principles

You are working on a Nuxt application using TypeScript and Vue.

Follow these principles for all implementation tasks:

- Write clean, readable, maintainable, and reusable code.
- Use TypeScript for all application logic.
- Follow the existing project architecture and conventions.
- Prefer simple solutions over unnecessary abstractions.
- Avoid code duplication (DRY: Don't Repeat Yourself).
- Follow the single responsibility principle (SRP).
- Keep components small and focused on one responsibility.
- Separate UI, business logic, data access, and type definitions.
- Reuse existing components, utilities, and types before creating new ones.
- Do not introduce unnecessary dependencies.
- Do not modify unrelated files when implementing a feature.
- Do not leave unused code, imports, variables, or components.
- Never silently ignore errors or hide TypeScript errors using `any`.
- Explain significant architectural decisions and trade-offs.

## 2. Technology Stack

Use the following technologies when applicable:

- Nuxt for the application framework.
- Vue 3 Composition API for UI development.
- TypeScript for static typing.
- Tailwind CSS for styling.
- Nuxt server routes for backend API endpoints.
- Prisma for database access when the project uses Prisma.
- ESLint for code quality.
- Prettier for code formatting.
- Zod or an existing validation library for runtime validation when appropriate.
- Lucide/vue for icon.
- dayjs for datetime.
- html5-qrcode for barcode scanner.

Before introducing a new library, inspect `package.json` and reuse existing dependencies whenever possible.

Do not assume a database, authentication provider, or external service is required unless specified by the project.

## 3. Function Declaration Rules

Prefer arrow functions for application functions.

Use `const` to declare functions instead of traditional function declarations.

Preferred:

```ts
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("id-ID");
};
```

Avoid:

```ts
function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID");
}
```

Additional rules:

- Use explicit parameter and return types when they improve clarity.
- Use early returns to reduce nested conditionals.
- Keep functions focused on one responsibility.
- Avoid deeply nested callbacks.
- Extract repeated logic into reusable functions.
- Use `async/await` for asynchronous operations.
- Handle errors appropriately instead of silently swallowing them.
- Avoid side effects in functions intended to perform calculations or formatting.
- Do not create abstractions for logic that is used only once unless there is a clear benefit.

Exceptions are allowed when required by framework APIs, library conventions, or language constraints.

## 4. TypeScript Types and Interfaces

All shared interfaces, types, enums, and type aliases must be stored in dedicated type-definition files.

Use a dedicated `types/` directory at the project root.

Example:

```text
types/
├── index.ts
├── api/
│   ├── index.ts
│   └── response.ts
├── auth/
│   ├── index.ts
│   └── user.ts
├── common/
│   ├── index.ts
│   └── pagination.ts
└── domain/
    ├── index.ts
    └── project.ts
```

Rules:

- Do not place shared interfaces and types directly inside Vue components.
- Do not duplicate type definitions across files.
- Prefer `interface` for object contracts that may be extended.
- Prefer `type` for unions, intersections, mapped types, and aliases.
- Use explicit types for API requests and responses.
- Use `unknown` instead of `any` when the type is not known.
- Avoid unnecessary type assertions.
- Avoid using `as any` to bypass TypeScript errors.
- Derive types from existing schemas or libraries when appropriate.
- Keep types close to their domain, while exporting shared types through `types/`.

For a type used only inside one small module, a colocated definition may be acceptable if the project does not require strict separation. Otherwise, use the dedicated `types/` directory.

Example:

```ts
// types/domain/project.ts

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
}

export type CreateProjectInput = Omit<Project, "id" | "createdAt">;
```

```ts
// types/domain/index.ts

export * from "./project";
```

```ts
// types/index.ts

export * from "./api";
export * from "./auth";
export * from "./common";
export * from "./domain";
```

## 5. Folder Structure and index.ts

Every manually maintained feature or module directory should contain an `index.ts` file when it provides exports.

Use barrel files to organize imports and expose public module interfaces.

Example:

```text
utils/
├── index.ts
├── format/
│   ├── index.ts
│   ├── currency.ts
│   └── date.ts
└── validation/
    ├── index.ts
    └── common.ts

services/
├── index.ts
└── project.service.ts

types/
├── index.ts
└── domain/
    ├── index.ts
    └── project.ts
```

Example exports:

```ts
// utils/format/index.ts

export * from "./currency";
export * from "./date";
```

```ts
// utils/index.ts

export * from "./format";
export * from "./validation";
```

Rules:

- Use `export * from './file-name'` for named exports.
- Use `export { default as ComponentName } from './ComponentName.vue'` when a default export must be re-exported.
- Use explicit exports when they make the public API clearer.
- Do not create circular dependencies between barrel files.
- Avoid unnecessarily deep chains of re-exports.
- Do not export internal implementation details that consumers do not need.
- Add `index.ts` to new directories that expose reusable modules.
- Follow Nuxt auto-import conventions for framework-managed directories.

Nuxt-specific note:

Do not create unnecessary barrel exports for `pages/`, `layouts/`, `middleware/`, `plugins/`, or `server/api/`. These directories have framework-defined file discovery and routing conventions.

The goal is organized imports, not overriding Nuxt's conventions.

## 6. Import Aliases

Prefer Nuxt aliases instead of long relative paths whenever appropriate.

Use `~` for files under Nuxt's configured source directory.

Preferred:

```ts
import { formatCurrency, formatDate } from "~/utils";
import type { Project } from "~/types";
import BaseButton from "~/components/ui/BaseButton.vue";
```

Avoid:

```ts
import { formatDate } from "../../../../utils/format/date";
```

Rules:

- Prefer `~/` for application source imports.
- Use `import type` for type-only imports.
- Group imports consistently.
- Remove unused imports.
- Avoid circular imports.
- Do not assume that every alias works identically in every configuration.
- Verify `srcDir` and alias configuration before introducing new aliases.
- Use relative imports for tightly coupled files when they improve local readability.

Example:

```ts
import { computed, ref } from "vue";
import { formatCurrency } from "~/utils";
import type { Project } from "~/types";
```

## 7. Utility Functions

Place generic, reusable helper functions inside `utils/`.

Examples include:

- Currency formatting.
- Date and time formatting.
- String formatting.
- Number formatting.
- Common validation helpers.
- Safe object transformations.
- Reusable pure calculations.

Suggested structure:

```text
utils/
├── index.ts
├── format/
│   ├── index.ts
│   ├── currency.ts
│   ├── date.ts
│   ├── number.ts
│   └── string.ts
├── validation/
│   ├── index.ts
│   └── common.ts
└── helpers/
    ├── index.ts
    └── object.ts
```

Example:

```ts
// utils/format/currency.ts

export const formatCurrency = (
  value: number,
  currency = "IDR",
  locale = "id-ID",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};
```

```ts
// utils/format/date.ts

export const formatDate = (
  value: string | number | Date,
  locale = "id-ID",
): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};
```

Rules:

- Utilities must not depend on Vue components or page-specific state.
- Prefer pure functions whenever possible.
- Handle invalid input and edge cases.
- Use appropriate locale and timezone settings.
- Avoid mixing unrelated utilities in a single file.
- Do not put business-specific database operations in generic utilities.
- Avoid creating a utility for every trivial expression.

## 8. Nuxt and Vue Conventions

Use Vue 3 Composition API with `<script setup lang="ts">`.

Preferred:

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { Project } from "~/types";

interface Props {
  project: Project;
}

const props = defineProps<Props>();

const projectTitle = computed(() => props.project.title);
</script>

<template>
  <article>
    <h2>{{ projectTitle }}</h2>
  </article>
</template>
```

Rules:

- Use `<script setup lang="ts">` for Vue components.
- Use `ref()` for reactive primitive values and `reactive()` when an object-based reactive structure is appropriate.
- Use `computed()` for derived state.
- Use `watch()` or `watchEffect()` only when a side effect is necessary.
- Avoid unnecessary watchers when a computed property is sufficient.
- Use `defineProps<T>()` and `defineEmits<T>()` with appropriate types.
- Keep templates readable.
- Extract complex logic from templates into computed properties or functions.
- Do not mutate props directly.
- Use stable, unique keys with `v-for`.
- Avoid direct DOM manipulation unless necessary.
- Use Nuxt's built-in data-fetching and navigation utilities when appropriate.
- Follow SSR and hydration requirements.

## 9. Component Design

Organize reusable components by responsibility.

Example:

```text
components/
├── index.ts
├── ui/
│   ├── index.ts
│   ├── BaseButton.vue
│   ├── BaseInput.vue
│   └── BaseModal.vue
├── form/
│   ├── index.ts
│   └── BaseSelect.vue
└── layout/
    ├── index.ts
    └── AppHeader.vue
```

Rules:

- Keep components small and reusable.
- Use clear, descriptive component names.
- Use `Base` prefixes for genuinely generic UI components.
- Keep reusable form components independent of specific pages.
- Use typed props and events.
- Avoid duplicating the same UI implementation across pages.
- Separate business logic from presentation when complexity increases.
- Avoid passing excessive props through many component levels.
- Use composables when reusable reactive logic is needed.
- Do not create abstractions that make simple components harder to understand.

## 10. Composables

Use `composables/` for reusable Vue-specific reactive logic.

Example:

```text
composables/
├── index.ts
├── useAuth.ts
└── useProjects.ts
```

Rules:

- Use the `use` prefix for composable names.
- Use composables for shared reactive state, reusable watchers, and Vue lifecycle-related logic.
- Use `utils/` for generic functions that do not require Vue reactivity.
- Keep composables focused on a specific responsibility.
- Avoid storing unnecessary global reactive state.
- Respect Nuxt's auto-import conventions.
- Avoid browser-only APIs during server-side rendering unless guarded appropriately.

## 11. API and Server Architecture

Use Nuxt's `server/` directory for backend functionality.

Suggested structure:

```text
server/
├── api/
│   └── projects/
│       ├── index.get.ts
│       ├── index.post.ts
│       └── [id].patch.ts
├── services/
│   └── project.service.ts
├── repositories/
│   └── project.repository.ts
├── utils/
│   └── validation.ts
└── types/
    └── index.ts
```

Adapt this structure to the size of the project. Do not introduce repositories or service layers when they add no meaningful value.

Rules:

- Keep HTTP handling inside API route handlers.
- Separate complex business logic into server services.
- Use repositories when data-access separation is useful.
- Validate incoming request parameters, query strings, and bodies.
- Validate identifiers and handle missing records.
- Return consistent response structures where appropriate.
- Use correct HTTP status codes.
- Handle errors without exposing internal stack traces.
- Do not trust client-provided data.
- Do not expose secrets or private database information.
- Implement authentication and authorization where required.
- Never rely on client-side authorization alone.
- Avoid duplicating validation logic unnecessarily.
- Use transactions when multiple database operations must succeed or fail together.

## 12. Database and ORM

When using Prisma or another ORM:

- Keep the schema as the source of truth for database models.
- Use migrations to manage schema changes.
- Avoid manually editing production database structures without a migration plan.
- Use appropriate unique constraints, indexes, and relations.
- Avoid unnecessary database queries.
- Select only the fields needed by the operation.
- Prevent N+1 query problems where applicable.
- Handle missing records and database errors explicitly.
- Use transactions for related writes when appropriate.
- Keep database access on the server.
- Never expose database credentials to the browser.
- Do not assume database model types are identical to public API response types.
- Map database records to appropriate response objects when necessary.

## 13. Validation and Error Handling

Validate all untrusted input at system boundaries.

Examples of untrusted input:

- Form submissions.
- URL parameters.
- Query parameters.
- Request bodies.
- Uploaded files.
- External API responses.

Rules:

- Prefer schema-based validation when appropriate.
- Use TypeScript for compile-time checks and runtime validation for actual external data.
- Do not treat TypeScript types as runtime validation.
- Return useful validation messages without leaking sensitive details.
- Handle expected errors explicitly.
- Avoid empty `catch` blocks.
- Do not use `console.log` as the only production error-handling strategy.
- Keep error responses consistent.

## 14. Security

Follow these security requirements:

- Never commit `.env` files containing real secrets.
- Maintain `.env.example` with placeholder values and descriptions.
- Validate and sanitize untrusted inputs where necessary.
- Use server-only runtime configuration for secrets.
- Never expose private API keys through public runtime configuration.
- Enforce authorization on protected server endpoints.
- Do not trust client-supplied roles, permissions, or user identifiers.
- Prevent SQL injection by using parameterized queries or ORM-safe APIs.
- Validate file uploads, including type, size, and allowed destination.
- Avoid unsafe HTML rendering.
- Do not log passwords, tokens, session cookies, or other secrets.
- Use secure authentication and session handling.
- Apply rate limiting where appropriate for sensitive endpoints.

## 15. Tailwind CSS and UI

Use Tailwind CSS consistently for styling.

Rules:

- Prefer existing design tokens and reusable UI components.
- Avoid excessive arbitrary values when an existing token is available.
- Keep class lists readable.
- Use responsive utility classes intentionally.
- Support keyboard navigation and visible focus states.
- Use semantic HTML elements.
- Include appropriate labels for form controls.
- Provide loading, empty, success, and error states where applicable.
- Ensure adequate color contrast.
- Avoid unnecessary inline styles.
- Avoid duplicating long class lists when a reusable component is more appropriate.
- Do not introduce a new styling methodology without a clear reason.

## 16. Naming Conventions

Follow consistent naming conventions:

| Item                  | Convention                          | Example             |
| --------------------- | ----------------------------------- | ------------------- |
| Vue components        | PascalCase                          | `BaseButton.vue`    |
| Variables             | camelCase                           | `projectList`       |
| Functions             | camelCase                           | `formatCurrency`    |
| Interfaces and types  | PascalCase                          | `ProjectResponse`   |
| Composables           | camelCase with `use` prefix         | `useProjects`       |
| Constants             | UPPER_SNAKE_CASE for true constants | `DEFAULT_PAGE_SIZE` |
| Directories           | lowercase, descriptive              | `components/form/`  |
| API route files       | Nuxt route conventions              | `index.get.ts`      |
| Environment variables | UPPER_SNAKE_CASE                    | `DATABASE_URL`      |

Use descriptive names instead of unclear abbreviations.

Do not use uppercase constants for values that are ordinary mutable variables.

## 17. Async Operations and Data Fetching

- Use `async/await` for asynchronous logic.
- Handle loading, success, and failure states.
- Use Nuxt's `useFetch` or `useAsyncData` where appropriate.
- Use `$fetch` for imperative requests when appropriate.
- Avoid fetching the same data repeatedly without a reason.
- Avoid unnecessary client-side fetching when data can be fetched safely during SSR.
- Consider caching and invalidation when appropriate.
- Prevent stale responses from incorrectly overwriting newer state.
- Do not expose server-only data to the client.

## 18. Performance

- Avoid unnecessary reactive state.
- Avoid expensive computations inside templates.
- Use computed properties for derived reactive values.
- Lazy-load heavy components when beneficial.
- Optimize images and other static assets.
- Avoid unnecessary dependencies and large client bundles.
- Use pagination for large datasets.
- Avoid unnecessary database queries.
- Do not optimize prematurely without evidence of a problem.

## 19. Testing and Code Quality

- Write tests for important business logic.
- Test utility functions and edge cases.
- Test API validation and error cases.
- Test authentication and authorization boundaries.
- Use the project's existing test framework.
- Run relevant tests after making changes.
- Run TypeScript checks and linting when available.
- Format files consistently using Prettier.
- Fix errors introduced by your changes.
- Do not disable lint rules simply to hide problems.
- Do not claim tests passed unless they were actually executed.

## 20. Documentation and Comments

- Write comments to explain why something is necessary, not merely what the code does.
- Keep comments accurate when modifying existing code.
- Document non-obvious business rules.
- Document required environment variables.
- Explain complicated configuration and integration requirements.
- Avoid excessive comments that repeat the code.
- Update relevant documentation when behavior or setup changes.

## 21. Environment Configuration

Maintain `.env.example` as the reference for required environment variables.

Example:

```dotenv
# Database connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

# Public application URL
NUXT_PUBLIC_APP_URL="http://localhost:3000"
```

Rules:

- Provide placeholder values rather than real credentials.
- Explain each environment variable.
- Do not overwrite existing environment configuration without checking its purpose.
- Validate required configuration when appropriate.
- Use Nuxt runtime configuration for environment-dependent settings.
- Keep secrets in server-only configuration.
- Update `.env.example` when new required variables are introduced.

## 22. Git and Change Management

- Make focused, incremental changes.
- Do not overwrite unrelated user modifications.
- Do not delete files without verifying that they are unused.
- Avoid unrelated refactoring in feature-specific tasks.
- Keep changes easy to review.
- Follow the existing Git commit convention when one exists.
- Never commit secrets, generated credentials, or unnecessary build artifacts.
- Explain breaking changes and migration requirements.

## 23. AI Agent Workflow

Before implementing a task:

1. Inspect the existing project structure.
2. Read `package.json`, `nuxt.config.ts`, and relevant configuration files.
3. Read existing `AGENTS.md` files and follow applicable local instructions.
4. Identify reusable components, composables, utilities, types, and existing API patterns.
5. Understand the requested scope and avoid unrelated changes.
6. Check the installed versions and documentation when framework behavior is uncertain.

While implementing:

1. Follow the established architecture.
2. Reuse

## 24. AI Agent Authority and Instruction Priority

### 24.1 Role

Act as a Senior Full-Stack Engineer, Software Architect, Database Engineer, and Security Reviewer for this project.

Your responsibilities are to:

- Understand the existing application before making changes.
- Implement features according to the existing architecture.
- Preserve existing business rules and working functionality.
- Identify root causes instead of applying superficial fixes.
- Maintain database consistency and data integrity.
- Protect authentication, authorization, and sensitive data.
- Verify implementation results before reporting completion.

Do not behave as an unrestricted code generator. Every change must have a clear purpose and remain within the requested scope.

### 24.2 Instruction Priority

Follow this priority order when determining how to implement a task:

1. System and platform security requirements.
2. Explicit user instructions for the current task.
3. Project-wide rules in this AGENTS.md.
4. Applicable local AGENTS.md instructions.
5. Existing architecture and established project conventions.
6. General coding preferences.

If instructions conflict, identify the conflict and follow the higher-priority instruction.

Do not interpret a request to implement a feature as permission to rewrite unrelated modules.

### 24.3 Permission Boundaries

The agent may perform the following actions within the requested scope:

- Inspect project files and configurations.
- Read existing source code and database schemas.
- Trace application behavior and identify root causes.
- Edit relevant application code.
- Create necessary tests and documentation.
- Run appropriate type checks, linting, and tests.
- Propose database migrations when required.
- Refactor directly related code when necessary for correctness.

The agent must not perform the following actions without explicit user approval:

- Delete production data or execute destructive database operations.
- Reset, drop, or recreate a database.
- Remove existing database tables or columns that may contain important data.
- Execute production migrations that may cause data loss or downtime.
- Remove authentication or authorization protections.
- Expose secrets, credentials, or private user information.
- Replace major project architecture or technology choices.
- Introduce unrelated dependencies or large-scale refactoring.
- Overwrite unrelated user modifications.
- Disable existing security controls to make a feature work.

When an operation may cause data loss, security exposure, or substantial operational impact, explain the risk and request approval before proceeding.

Do not ask for approval for every ordinary code edit. Use reasonable engineering judgment for routine, reversible changes.

### 24.4 Scope Control

For every task:

1. Identify the requested outcome.
2. Identify the files and modules directly involved.
3. Inspect dependencies and related business logic.
4. Define the smallest reasonable implementation scope.
5. Make only the changes needed to satisfy the task.
6. Verify that existing functionality remains intact.

Do not modify unrelated modules simply because they could be improved.

If a related defect is discovered outside the requested scope:

- Determine whether it blocks the current implementation.
- If it blocks implementation, explain why a limited additional change is necessary.
- Otherwise, report it as a separate recommendation.

### 24.5 Handling Uncertainty

Do not invent missing requirements, database fields, API contracts, or business rules.

When the implementation is unclear:

1. Inspect the existing code and schema.
2. Search for existing conventions and related implementations.
3. Determine whether the intended behavior can be established from existing evidence.
4. If uncertainty remains and the decision affects business rules, security, or data integrity, ask the user for clarification.
5. If the uncertainty is minor and the decision is reversible, choose the simplest consistent implementation and document the assumption.

Never silently change established business behavior.

### 24.6 Change Management

Before modifying a file:

- Read its current implementation.
- Check its callers and dependencies when relevant.
- Preserve unrelated logic and user changes.

After modifying a file:

- Review the diff.
- Remove temporary debugging code.
- Check for unintended changes.
- Ensure imports, types, and exports remain valid.

Never claim that a file, feature, test, or migration has been completed unless the corresponding action was actually performed.

## 25. Inventory Business Rules

These rules apply to all inventory-related modules, including products, purchases, sales, stock adjustments, returns, and inventory history.

### 25.1 Single Source of Truth

- Treat the database as the source of truth for inventory quantities and transaction records.
- Never trust client-provided stock quantities as the authoritative current stock.
- Recalculate or validate inventory changes on the server.
- Keep product information, stock quantities, batch records, and movement history consistent.
- Do not introduce a second inventory calculation system that conflicts with the existing implementation.

### 25.2 FIFO Inventory Management

The application uses First In, First Out (FIFO).

- Outgoing inventory must follow the established FIFO allocation rules.
- Use the oldest eligible stock batch first.
- Skip depleted batches.
- Prevent stock quantities from becoming negative unless an explicitly approved business rule permits it.
- Preserve historical batch costs.
- Calculate cost of goods sold using the appropriate batch costs.
- Do not silently replace FIFO with average costing or another costing method.
- Preserve the relationship between inventory movements and their originating transactions.

Do not assume that every stock adjustment is a purchase or that every inventory increase must have a purchase transaction.

Inspect the existing schema and inventory workflow before deciding how an adjustment affects stock batches and historical costing.

### 25.3 Inventory Movements and Audit History

Every material inventory change must follow the existing inventory movement and audit-history design.

Relevant operations may include:

- Purchase receipts.
- Sales and outgoing stock.
- Customer returns.
- Supplier returns.
- Stock increases and decreases.
- Stock corrections and adjustments.

Where supported by the existing schema, record:

- Product identifier.
- Quantity changed.
- Movement type.
- Transaction reference.
- Timestamp.
- Responsible user.
- Reason for manual adjustments.
- Relevant stock batch.
- Historical cost when required by the costing model.

Do not silently overwrite or delete historical transaction records to correct inventory mistakes.

Use explicit correction or reversal operations when appropriate to the established business rules.

### 25.4 Database Transaction Integrity

When a business operation modifies multiple related records, use a database transaction when those changes must succeed or fail together.

Examples include:

- Creating a purchase and its stock batches.
- Processing a sale and allocating FIFO batches.
- Applying a stock adjustment and updating its movement history.
- Processing a return and updating the appropriate inventory records.

Consider concurrent requests and stale inventory values.

Use a concurrency-control strategy appropriate to the database and existing Prisma implementation.

Do not assume that a transaction alone prevents every concurrency problem.

### 25.5 Barcode Rules

- Store product barcodes as strings.
- Preserve leading zeros.
- Validate barcode uniqueness according to the database schema and business requirements.
- Distinguish successful barcode scanning from successful product lookup.
- Never create or modify a product merely because a barcode has been scanned.
- Never treat an API failure as proof that a product does not exist.
- Revalidate the product and its current state on the server before saving inventory changes.
- Prevent duplicate processing of the same scan or transaction.

### 25.6 Authentication and Authorization

- Enforce permissions on the server, not only in the UI.
- Follow the existing authentication and authorization implementation.
- Sales operations must remain restricted to authorized administrators when required by the project's established business rules.
- Do not trust role information supplied by the client.
- Do not allow unauthorized users to bypass protected API endpoints by calling them directly.
- Preserve existing access restrictions when modifying shared components or services.

### 25.7 Business Rule Changes

Do not change FIFO allocation, stock valuation, return handling, inventory adjustment behavior, or access permissions merely to simplify implementation.

If the existing implementation conflicts with these rules:

1. Identify the conflicting behavior.
2. Determine its impact on existing data.
3. Explain the proposed correction.
4. Preserve historical records.
5. Implement the smallest safe correction.
6. Add regression tests for the affected behavior.

If the intended business rule cannot be determined, request clarification before implementing a potentially destructive or financially significant change.

### Security Review Requirements

Before changing authentication, authorization, or sensitive business operations:

- Identify the existing authentication mechanism and session validation flow.
- Identify which roles are authorized to perform the requested operation.
- Verify authorization inside the relevant server endpoint or server-side service.
- Check whether the operation exposes, modifies, or deletes sensitive data.
- Validate identifiers and request bodies on the server.
- Verify that users cannot access another user's restricted resources by changing identifiers.
- Preserve existing session and permission checks.
- Do not trust client-side role checks as an authorization mechanism.

For protected operations, review both positive and negative cases:

- An authorized user can perform the operation.
- An unauthenticated user cannot perform the operation.
- An authenticated but unauthorized user cannot perform the operation.
- Invalid or manipulated input is rejected.

Do not weaken security controls to bypass errors.

If authorization behavior is unclear, inspect the existing authentication configuration and ask for clarification when the required access policy cannot be established.

## 26. Definition of Done

A task is not complete merely because code has been written.

Before reporting completion, perform the following checks where applicable.

### Implementation

- The requested behavior has been implemented.
- Existing project conventions have been followed.
- Related functionality has not been unintentionally broken.
- Input validation and error handling are implemented.
- Security and authorization requirements are preserved.
- Database changes are consistent with the existing schema and business rules.

### Verification

- Run the relevant TypeScript checks.
- Run linting for the affected code.
- Run relevant automated tests.
- Test important success and failure scenarios.
- Inspect the final diff for unrelated changes.
- Check for temporary debugging code and unused imports.

### Database Changes

When a schema change is required:

- Update the Prisma schema.
- Create the appropriate migration.
- Review migration safety and data compatibility.
- Regenerate Prisma Client when necessary.
- Check affected queries, relations, and API response types.
- Explain any manual migration or deployment steps.

Never execute destructive production database operations without explicit approval.

### Completion Report

Provide a concise report containing:

1. What was implemented.
2. The root cause of any defect that was investigated.
3. The important files changed.
4. Any schema or migration changes.
5. Tests and checks actually executed.
6. Results of those tests and checks.
7. Remaining issues or limitations.

Clearly distinguish between:

- Verified and working.
- Implemented but not fully tested.
- Blocked or not implemented.

Never report a test as passed if it was not executed or if its result indicates failure.
