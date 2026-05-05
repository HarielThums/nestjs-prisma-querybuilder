# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                   # run all tests
npm run test:coverage      # run tests with Istanbul coverage report
npm run build              # compile TypeScript to dist/
npm run lint               # ESLint with auto-fix
npm run format             # Prettier with auto-fix
```

> Note: Jest flags use `--testPathPatterns` (plural) — the singular form is deprecated and will error.

## Architecture

This is a NestJS library that translates HTTP query strings into Prisma-compatible query objects. It exposes two main entry points:

- **`Querybuilder`** — low-level `@Global()` service. Parse and validate the query string, returns `Partial<QueryResponse>`. Injected directly when the caller wants full control.
- **`QuerybuilderService`** — higher-level wrapper instantiated via `QuerybuilderModule.forRootAsync()`. Adds `prisma[model].count()` for the `count` header, `mergeWhere`, `justPaginate`, and error normalisation.

Consumers should prefer `QuerybuilderModule.forRootAsync()` + `QuerybuilderService`. Injecting `Querybuilder` directly remains supported for custom wrappers.

### Request pipeline

```
HTTP request.query
  → qs.parse()           (depth-limited, default depth=5)
  → QueryValidator DTO   (class-transformer + class-validator)
  → buildQuery()         (synchronous pipeline)
      paginate → sort → distinct → select → populate → filter
  → plainToClass(QueryResponse)  (strips non-Prisma fields)
```

`query()` is async (validates), `buildQuery()` is sync (pure transform — used directly in unit tests).

### Key files

| File | Role |
|------|------|
| `src/querybuilder/queryBuilder.ts` | `Querybuilder` — core service: `query()` and `buildQuery()` |
| `src/querybuilder/queryBuilder.service.ts` | `QuerybuilderService` — high-level wrapper with count/mergeWhere/justPaginate |
| `src/querybuilder/queryBuilder.module.ts` | `QuerybuilderModule.forRootAsync()` — registers both services via DI |
| `src/querybuilder/constants/queryBuilder.constants.ts` | `QUERYBUILDER_DEFAULT`, `getQuerybuilderToken(name?)` |
| `src/querybuilder/decorators/queryBuilder.decorator.ts` | `@InjectQuerybuilder(name?)` — resolves the correct DI token |
| `src/querybuilder/dto/queryValidator.dto.ts` | Incoming query shape (page, limit, select, distinct, sort, filter, populate) |
| `src/querybuilder/dto/queryResponse.dto.ts` | Outgoing Prisma shape (where, orderBy, skip, take, distinct, select, include) |
| `src/querybuilder/dto/filterFields.dto.ts` | Filter DTO with all operators and filterGroup/filterInsideOperator |
| `src/querybuilder/dto/populateFields.dto.ts` | Populate DTO (recursive: populate contains populate) |
| `src/querybuilder/functions/*.fn.ts` | One pure function per Prisma clause |
| `src/utils/functions/plainToClass.fn.ts` | Wrapper around class-transformer with defaults (enableImplicitConversion, exposeUnsetFields: false) |
| `src/utils/functions/validateOrReject.fn.ts` | Wrapper around class-validator that throws `BadRequestException` |

### Module registration and DI

`QuerybuilderModule.forRootAsync()` accepts:

```typescript
interface QuerybuilderModuleAsyncOptions {
  name?: string;          // omit for the default instance
  global?: boolean;       // default true
  imports?: any[];        // NestJS modules to import (e.g. PrismaModule)
  inject?: any[];         // tokens to inject into useFactory
  useFactory: (...args: unknown[]) => { prisma: Record<string, any> } | Promise<...>;
}
```

Internally:
- Always registers `Querybuilder` (the core service) as a provider.
- Creates a named provider keyed by `getQuerybuilderToken(name)` — a string token (`QUERYBUILDER_DEFAULT` or `QUERYBUILDER_SERVICE_<name>`).
- `QuerybuilderService` is instantiated with `new` inside `useFactory`, receiving `Querybuilder` (resolved by NestJS) and `prisma` (from the factory closure). This avoids circular DI issues that arise when trying to inject `prisma` as a class token across module boundaries.
- For the default instance (no `name`): also registers `{ provide: QuerybuilderService, useExisting: QUERYBUILDER_DEFAULT }` so consumers can inject by class directly.
- For named instances: consumers use `@InjectQuerybuilder('name')` to get the correct token.

`Querybuilder` has `readonly request: Request` (not `private`) so that `QuerybuilderService` can access `request.res` without its own `@Inject(REQUEST)`.

### Multiple named instances

```typescript
// app.module.ts
QuerybuilderModule.forRootAsync({ imports: [PrismaModule], inject: [PrismaService], useFactory: (p) => ({ prisma: p }) }),
QuerybuilderModule.forRootAsync({ name: 'secondary', imports: [SecondaryPrismaModule], inject: [SecondaryPrismaService], useFactory: (p) => ({ prisma: p }) }),
```

```typescript
constructor(
  private readonly qb: QuerybuilderService,                     // default
  @InjectQuerybuilder('secondary') private readonly qb2: QuerybuilderService,
) {}
```

### select vs include

`select` is the default. `include` is only used when `query.select === 'all'` **and** `forbiddenFields` is empty — in that case `select` is deleted and replaced with `include`.

### populate internals

`populate.fn.ts` runs two passes over the populate array:
1. `populateAddSelectPrimaryKey` — seeds each nested path with `{ select: { [primaryKey]: true } }`
2. `populateAddSelectFieldsAndFilter` — adds selected fields, recurses into nested populate, applies `filter`

The recursion in pass 2 runs **outside** the `if (populate[index]?.select)` guard — this is intentional: a parent populate without `select` must still process its children's `select` and `filter`.

### filter internals

`filter.fn.ts` mutates the input object (sets `where`, deletes `filter`). `filterInsideOperator` (`some`/`every`/`none`) is declared on the **child** filter, not the parent — it scopes how the parent relation is queried (e.g. `posts` where `some` comments match).

### forbiddenFields

Passed through the entire pipeline. Any field in `forbiddenFields` is stripped from: top-level populate paths, nested select fields, filter paths, sort fields, distinct fields, and the `select` clause.

### depth parameter

`query(primaryKey, depth, setHeaders, forbiddenFields)` — `depth` controls `qs.parse` object nesting depth (default `5`). For deeply nested populate via query string, callers may need to increase this.
