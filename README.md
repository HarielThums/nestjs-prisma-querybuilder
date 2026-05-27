# nestjs-prisma-querybuilder

[npm version](https://www.npmjs.com/package/nestjs-prisma-querybuilder)
[license](LICENSE)

A query string parser for **NestJS + Prisma** that lets the frontend control pagination, sorting, filtering, field selection and relation population — all via URL parameters, keeping your API RESTful.

## How it works

```
GET /posts?select=title,published&filter[0][path]=published&filter[0][value]=true&filter[0][type]=boolean&page=1&limit=5
```

The library reads the query string from the request and produces a Prisma-ready object:

```json
{
  "select": { "id": true, "title": true, "published": true },
  "where": { "published": true },
  "skip": 0,
  "take": 5
}
```

Then you simply pass it to Prisma:

```typescript
const query = await this.qb.query({ model: 'Post' });
return this.prisma.post.findMany(query);
```

## Installation

```bash
npm i nestjs-prisma-querybuilder
```

## Quick Start

### 1. Register the module

```typescript
// app.module.ts
import { QuerybuilderModule } from 'nestjs-prisma-querybuilder';

@Module({
  imports: [
    QuerybuilderModule.forRootAsync({
      imports: [PrismaModule],   // the module that exports your PrismaService
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({ prisma }),
    }),
  ],
})
export class AppModule {}
```

`PrismaService` is **your** service — see the official docs on how to create it: [@nestjs/prisma](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services).

The module is **global by default**, so you only register it once. Set `global: false` if you prefer explicit imports.

### 2. Inject and use

```typescript
// posts.service.ts
import { Injectable } from '@nestjs/common';
import { QuerybuilderService } from 'nestjs-prisma-querybuilder';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qb: QuerybuilderService,
  ) {}

  async findAll() {
    const query = await this.qb.query({ model: 'Post' });
    return this.prisma.post.findMany(query);
  }
}
```

`QuerybuilderService.query()` automatically:

- Parses and validates the query string
- Sets `count`, `page`, and `maxtake` (when configured) response headers
- Returns a `Partial<QueryResponse>` ready for `findMany`

### CORS

If your project has CORS configured, add `**count**`, `**page**`, and `**maxtake**` to your `exposedHeaders` so the frontend can read them.

---

## QuerybuilderService.query() options

```typescript
await this.qb.query({
  model: 'Post',           // model name as it appears in schema.prisma
  primaryKey: 'id',        // primary key field (default: 'id')
  where: { authorId: 1 }, // extra where clause
  mergeWhere: true,        // true = merge with query string where, false = replace it
  paginationOnly: false,   // true = strip select/include (count queries)
  setHeaders: true,        // false = skip count query and headers
  depth: 5,                // qs parse depth (default: 5)
  forbiddenFields: ['password', 'refreshToken'], // fields stripped everywhere
  maxTake: 50,             // overrides instance maxTake for this call; 0 = no cap
  onQuery: (q) => q,       // overrides instance onQuery for this call; null = disable
})
```

---

## Multiple PrismaService instances

If your project has more than one Prisma client (e.g. multiple databases), register one module per client and use `@InjectQuerybuilder` to disambiguate:

```typescript
// app.module.ts
import { QuerybuilderModule, InjectQuerybuilder } from 'nestjs-prisma-querybuilder';

@Module({
  imports: [
    QuerybuilderModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({ prisma }),
    }),
    QuerybuilderModule.forRootAsync({
      name: 'secondary',
      imports: [SecondaryPrismaModule],
      inject: [SecondaryPrismaService],
      useFactory: (prisma: SecondaryPrismaService) => ({ prisma }),
    }),
  ],
})
export class AppModule {}
```

```typescript
// my.service.ts
import { Injectable } from '@nestjs/common';
import { QuerybuilderService, InjectQuerybuilder } from 'nestjs-prisma-querybuilder';

@Injectable()
export class MyService {
  constructor(
    private readonly qb: QuerybuilderService,                              // default instance
    @InjectQuerybuilder('secondary') private readonly qb2: QuerybuilderService, // secondary instance
  ) {}
}
```

## Strong typing for `model` and `where`

`QuerybuilderService` is generic: `QuerybuilderService<TPrisma>`. This is **optional** — without it everything works as before, just loosely typed. When typed, `model` is autocompleted from your Prisma schema and `where` receives the correct type (e.g. `Prisma.PostWhereInput`).

> **NestJS DI limitation**: TypeScript generics are erased at runtime, so the injector cannot carry the type parameter automatically. You must declare it explicitly on the constructor parameter.

```typescript
import { Injectable } from '@nestjs/common';
import { QuerybuilderService, InjectQuerybuilder } from 'nestjs-prisma-querybuilder';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(
    private readonly qb: QuerybuilderService<PrismaClient>,
    @InjectQuerybuilder('secondary') private readonly qb2: QuerybuilderService<PrismaClient>,
  ) {}

  async findAll() {
    // 'model' autocompletes with your schema models
    // 'where' is typed as Prisma.PostWhereInput
    const query = await this.qb.query({ model: 'Post', where: { published: true } });
    return this.prisma.post.findMany(query);
  }
}
```

## `forRootAsync` options

| Option | Type | Description |
|--------|------|-------------|
| `prisma` | `Record<string, any>` | Your PrismaClient/PrismaService instance |
| `maxTake` | `number` | Caps the `take` (limit) on every query — prevents clients from fetching unbounded rows |
| `onQuery` | `(query) => query` | Hook called after every query build — use it to inject global `where`, force `orderBy`, audit logs, etc. |

```typescript
QuerybuilderModule.forRootAsync({
  imports: [PrismaModule],
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) => ({
    prisma,
    maxTake: 100,
    onQuery: (query) => ({ ...query, where: { ...query.where, tenantId: 1 } }),
  }),
})
```

`onQuery` receives the fully built query object and must return the (optionally modified) query. It runs after `maxTake` and before the `count` query — so the response header reflects any global `where` injected by the hook.

Both `maxTake` and `onQuery` can also be passed directly to `.query()` to override the instance-level value for a single call. Pass `maxTake: 0` to remove the cap, or `onQuery: null` to skip the hook:

```typescript
// no cap and no hook for this specific endpoint (e.g. an export)
const query = await this.qb.query({ model: 'Post', maxTake: 0, onQuery: null });
```

---

## Advanced: custom wrapper

If you need logic that goes beyond what `QuerybuilderService` provides, you can inject `Querybuilder` directly and build your own wrapper:

```typescript
// app.module.ts
import { QuerybuilderService } from './querybuilder.service.ts'

@Module({
  providers: [QuerybuilderService],
  exports: [QuerybuilderService]
})
export class AppModule {}
```

```typescript
// querybuilder.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Querybuilder, QueryResponse } from 'nestjs-prisma-querybuilder';
import { Request } from 'express';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class QuerybuilderService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly querybuilder: Querybuilder,
    private readonly prisma: PrismaService,
  ) {}

  async query({
    model,
    depth,
    where,
    mergeWhere,
    paginationOnly,
    forbiddenFields,
    primaryKey = 'id',
    setHeaders = true,
  }: {
    model: Prisma.ModelName;
    where?: any;
    depth?: number;
    primaryKey?: string;
    mergeWhere?: boolean;
    setHeaders?: boolean;
    paginationOnly?: boolean;
    forbiddenFields?: string[];
  }): Promise<Partial<QueryResponse>> {
    return this.querybuilder
      .query(primaryKey, depth, setHeaders, forbiddenFields)
      .then(async (query) => {
        if (where) query.where = mergeWhere ? { ...query.where, ...where } : where;

        if (setHeaders) {
          const count = await this.prisma[model].count({ where: query.where });
          this.request.res.setHeader('count', count);
        }

        if (paginationOnly) {
          delete query.include;
          delete query.select;
        }

        return { ...query };
      })
      .catch((err) => {
        if (err.response?.message) throw new BadRequestException(err.response?.message);
        throw new BadRequestException('Internal error processing your query string, check your parameters');
      });
  }
}
```

---

## Query String Parameters

Example Prisma models used in the docs below

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]

  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  published Boolean? @default(false)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
  content   Content[]

  @@map("posts")
}

model Content {
  id     Int    @id @default(autoincrement())
  text   String
  post   Post   @relation(fields: [postId], references: [id])
  postId Int

  @@map("contents")
}
```

### Page and Limit

Pagination is always enabled. If the consumer doesn't send `page` and `limit`, it defaults to page 1 with 10 items.

The response headers will contain `count` (total items), `page` (current page number), and `maxtake` (the active cap, when `maxTake` is configured).

```
GET /posts?page=2&limit=10
```

### Sort


| Property   | Required | Description                      |
| ---------- | -------- | -------------------------------- |
| `field`    | yes      | The field to sort by             |
| `criteria` | no       | `asc` or `desc` (default: `asc`) |


```
GET /posts?sort[field]=title&sort[criteria]=desc
```

For multi-column ordering, pass `sort` as an indexed array:

```
GET /posts?sort[0][field]=publishedAt&sort[0][criteria]=desc&sort[1][field]=title&sort[1][criteria]=asc
```

This produces `orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }]`. The single-object form remains fully supported.

### Select

Fields are separated by **blank space, comma or semicolon**.

- By default, if no `select` is sent, only the `id` field is returned.
- Use `select=all` to return the entire object.
- Selecting a relationship field returns the full related object. To select specific fields in a relation, use `populate`. To get only a foreign key, use the FK column directly (e.g. `authorId`).
- When using `forbiddenFields`, `select=all` is ignored.

```
GET /posts?select=id title,published;authorId
```

### Distinct

Fields are separated by **blank space, comma or semicolon**.

```
GET /posts?distinct=title published
```

### Populate

Populate is an array that lets you select specific fields from related models.


| Property     | Required | Description                                                                                           |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `path`       | yes      | The relationship name (e.g. `author`)                                                                 |
| `select`     | yes      | Fields to return (space/comma/semicolon separated). `select=all` is **not** supported inside populate |
| `primaryKey` | no       | Primary key of the relation (default: `id`)                                                           |
| `populate`   | no       | Nested populate for deeper relations                                                                  |
| `filter`     | no       | `FilterFields[]` to filter the related records                                                        |


Use the array index to link `path` and `select`:

```
GET /posts?populate[0][path]=author&populate[0][select]=name email
```

**Nested populate** (relations inside relations):

```
GET /users?populate[0][path]=posts&populate[0][select]=title&populate[0][populate][0][path]=content&populate[0][populate][0][select]=text
```

**Filter inside populate** (filter the related records):

```
GET /users?populate[0][path]=posts&populate[0][select]=title published&populate[0][filter][0][path]=published&populate[0][filter][0][value]=true&populate[0][filter][0][type]=boolean
```

When using `select=all` together with `populate`, the library uses Prisma's `include` instead of `select`, returning all model fields alongside the populated relations.

### Filter

Filter is an array that builds the Prisma `where` clause.


| Property               | Required | Description                                                                                                                                                                                      |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`                 | yes      | The field to filter on                                                                                                                                                                           |
| `value`                | yes*     | The value to filter by (*optional when using nested `filter`)                                                                                                                                    |
| `type`                 | no       | Value type: `string` (default), `boolean`, `number`, `date`, `object`. The `object` type accepts `null` or `undefined`                                                                           |
| `operator`             | no       | Prisma operator: `contains`, `endsWith`, `startsWith`, `equals`, `gt`, `gte`, `in`, `lt`, `lte`, `not`, `notIn`, `hasEvery`, `hasSome`, `has`, `isEmpty`                                         |
| `filterGroup`          | no       | Groups filters with Prisma logical operators: `and`, `or`, `not`                                                                                                                                 |
| `insensitive`          | no       | `'true'` or `'false'` (default: `'false'`). See [Prisma case sensitivity](https://www.prisma.io/docs/concepts/components/prisma-client/case-sensitivity#database-collation-and-case-sensitivity) |
| `filter`               | no       | `FilterFields[]` for nested/relation filters                                                                                                                                                     |
| `filterInsideOperator` | no       | Prisma relation operator for nested filters: `none`, `some`, `every`                                                                                                                             |


The operators `in`, `notIn`, `hasEvery` and `hasSome` accept multiple values separated by **comma or semicolon**:

```
GET /posts?filter[0][path]=title&filter[0][operator]=in&filter[0][value]=foo,bar,baz
```

Simple filters:

```
GET /posts?filter[0][path]=title&filter[0][value]=querybuilder
GET /posts?filter[0][path]=published&filter[0][value]=true&filter[0][type]=boolean
```

Using `filterGroup`:

```
GET /posts?filter[0][path]=title&filter[0][value]=querybuilder&filter[0][filterGroup]=and&filter[1][path]=published&filter[1][value]=true&filter[1][type]=boolean&filter[1][filterGroup]=and
```

**Nested filter** (filter on related models):

```
GET /posts?filter[0][path]=author&filter[0][filter][0][path]=name&filter[0][filter][0][value]=John
```

**filterInsideOperator** (Prisma relation operators with nested filters):

```
GET /posts?filter[0][path]=author&filter[0][filter][0][path]=name&filter[0][filter][0][value]=John&filter[0][filter][0][filterInsideOperator]=some
```

---

## QueryResponse

The `query()` method returns a `Partial<QueryResponse>` object ready to be passed to any Prisma `findMany` call:

```typescript
interface QueryResponse {
  where: any;
  orderBy?: any;
  skip?: number;
  take?: number;
  distinct?: string[];
  select?: Record<string, boolean>;
  include?: Record<string, any>;
}
```

`QueryResponse` is exported from the package and can be imported directly:

```typescript
import { QueryResponse } from 'nestjs-prisma-querybuilder';
```

---

## Security

Since the query string is controlled by the frontend, any field in your database can potentially be requested or filtered. Two complementary strategies are recommended:

**1. `forbiddenFields`** — Prevent sensitive fields from being selected, filtered, sorted or populated:

```typescript
const query = await this.qb.query({
  model: 'User',
  forbiddenFields: ['password', 'refreshToken', 'resetCode'],
});
```

When `forbiddenFields` is set, `select=all` is automatically ignored, so users cannot bypass the restriction.

**2. Response DTOs with `plainToClass`** — As a second layer of defense, transform the Prisma response through a DTO before returning it to the client. This ensures that even if a field leaks through the query, it will be stripped from the response:

```typescript
import { plainToClass } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';

async findAll() {
  const query = await this.qb.query({
    model: 'User',
    forbiddenFields: ['password', 'refreshToken'],
  });

  const users = await this.prisma.user.findMany(query);
  return users.map((user) => plainToClass(UserResponseDto, user, { excludeExtraneousValues: true }));
}
```

Using both approaches together gives you defense in depth: `forbiddenFields` prevents the data from being queried, and the DTO prevents it from being returned.

---

## Caveats

- `select=all` is **not** supported inside `populate` — it only works at the top level.
- Deep nested filters inside `populate` may not work fully at multiple levels.
- The `depth` parameter controls the `qs` parsing depth (default: `5`). If you have deeply nested queries, you may need to increase this value.

---

## Frontend Interface

You can use the companion package to build query strings more easily on the frontend:

**[nestjs-prisma-querybuilder-interface](https://www.npmjs.com/package/nestjs-prisma-querybuilder-interface)**

---

## License

[MIT](LICENSE)

---

Documentação em Português

## nestjs-prisma-querybuilder

Um parser de query string para **NestJS + Prisma** que permite ao frontend controlar paginação, ordenação, filtros, seleção de campos e população de relações — tudo via parâmetros de URL, mantendo sua API RESTful.

### Como funciona

```
GET /posts?select=title,published&filter[0][path]=published&filter[0][value]=true&filter[0][type]=boolean&page=1&limit=5
```

A biblioteca lê a query string da request e produz um objeto pronto para o Prisma:

```json
{
  "select": { "id": true, "title": true, "published": true },
  "where": { "published": true },
  "skip": 0,
  "take": 5
}
```

Depois basta passar para o Prisma:

```typescript
const query = await this.qb.query({ model: 'Post' });
return this.prisma.post.findMany(query);
```

### Instalação

```bash
npm i nestjs-prisma-querybuilder
```

### Quick Start

#### 1. Registrar o módulo

```typescript
// app.module.ts
import { QuerybuilderModule } from 'nestjs-prisma-querybuilder';

@Module({
  imports: [
    QuerybuilderModule.forRootAsync({
      imports: [PrismaModule],   // módulo que exporta o PrismaService
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({ prisma }),
    }),
  ],
})
export class AppModule {}
```

`PrismaService` é o **seu** service — veja a documentação oficial para criá-lo: [@nestjs/prisma](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services).

O módulo é **global por padrão** — registre uma única vez. Use `global: false` para imports explícitos.

#### 2. Injetar e usar

```typescript
// posts.service.ts
import { Injectable } from '@nestjs/common';
import { QuerybuilderService } from 'nestjs-prisma-querybuilder';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qb: QuerybuilderService,
  ) {}

  async findAll() {
    const query = await this.qb.query({ model: 'Post' });
    return this.prisma.post.findMany(query);
  }
}
```

#### CORS

Se o seu projeto tem CORS configurado, adicione `**count**`, `**page**` e `**maxtake**` ao `exposedHeaders` para que o frontend consiga ler esses headers.

---

### Opções do QuerybuilderService.query()

```typescript
await this.qb.query({
  model: 'Post',
  primaryKey: 'id',
  where: { authorId: 1 },
  mergeWhere: true,
  paginationOnly: false,
  setHeaders: true,
  depth: 5,
  forbiddenFields: ['password', 'refreshToken'],
  maxTake: 50,             // sobrescreve o maxTake da instância nesta chamada; 0 = sem limite
  onQuery: (q) => q,       // sobrescreve o onQuery da instância nesta chamada; null = desabilita
})
```

---

### Múltiplas instâncias do PrismaService

Se o seu projeto tem mais de um Prisma client, registre um módulo por client e use `@InjectQuerybuilder` para diferenciar:

```typescript
// app.module.ts
QuerybuilderModule.forRootAsync({
  imports: [PrismaModule],
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) => ({ prisma }),
}),
QuerybuilderModule.forRootAsync({
  name: 'secondary',
  imports: [SecondaryPrismaModule],
  inject: [SecondaryPrismaService],
  useFactory: (prisma: SecondaryPrismaService) => ({ prisma }),
}),
```

```typescript
constructor(
  private readonly qb: QuerybuilderService,
  @InjectQuerybuilder('secondary') private readonly qb2: QuerybuilderService,
) {}
```

### Tipagem forte para `model` e `where`

`QuerybuilderService` é genérico: `QuerybuilderService<TPrisma>`. Isso é **opcional** — sem ele tudo funciona normalmente, apenas sem tipagem estrita. Quando tipado, `model` é autocompletado a partir do seu schema Prisma e `where` recebe o tipo correto (ex: `Prisma.PostWhereInput`).

> **Limitação do DI do NestJS**: generics TypeScript são apagados em runtime, então o injector não consegue carregar o tipo parametrizado automaticamente. É necessário declará-lo explicitamente no parâmetro do constructor.

```typescript
import { Injectable } from '@nestjs/common';
import { QuerybuilderService, InjectQuerybuilder } from 'nestjs-prisma-querybuilder';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(
    private readonly qb: QuerybuilderService<PrismaClient>,
    @InjectQuerybuilder('secondary') private readonly qb2: QuerybuilderService<PrismaClient>,
  ) {}

  async findAll() {
    // 'model' autocompleta com os models do seu schema
    // 'where' é tipado como Prisma.PostWhereInput
    const query = await this.qb.query({ model: 'Post', where: { published: true } });
    return this.prisma.post.findMany(query);
  }
}
```

### Opções do `forRootAsync`

| Opção | Tipo | Descrição |
|-------|------|-----------|
| `prisma` | `Record<string, any>` | Instância do PrismaClient/PrismaService |
| `maxTake` | `number` | Limita o `take` (limit) em todas as queries — evita que clientes busquem linhas sem limite |
| `onQuery` | `(query) => query` | Hook chamado após cada build de query — use para injetar `where` global, forçar `orderBy`, logs de auditoria, etc. |

```typescript
QuerybuilderModule.forRootAsync({
  imports: [PrismaModule],
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) => ({
    prisma,
    maxTake: 100,
    onQuery: (query) => ({ ...query, where: { ...query.where, tenantId: 1 } }),
  }),
})
```

`onQuery` recebe o objeto de query já construído e deve retornar a query (opcionalmente modificada). Executa após o `maxTake` e antes da query de `count` — assim o header de total reflete qualquer `where` global injetado pelo hook.

Tanto `maxTake` quanto `onQuery` também podem ser passados diretamente no `.query()` para sobrescrever o valor da instância em uma única chamada. Use `maxTake: 0` para remover o limite, ou `onQuery: null` para desabilitar o hook:

```typescript
// sem limite e sem hook neste endpoint específico (ex: exportação)
const query = await this.qb.query({ model: 'Post', maxTake: 0, onQuery: null });
```

---

### Avançado: wrapper customizado

Se precisar de lógica além do que `QuerybuilderService` oferece, injete `Querybuilder` diretamente e crie seu próprio wrapper:

```typescript
// app.module.ts
import { QuerybuilderService } from './querybuilder.service.ts';

@Module({
  providers: [QuerybuilderService],
  exports: [QuerybuilderService]
})
export class AppModule {}
```

```typescript
// querybuilder.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Querybuilder, QueryResponse } from 'nestjs-prisma-querybuilder';
import { Request } from 'express';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class QuerybuilderService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly querybuilder: Querybuilder,
    private readonly prisma: PrismaService,
  ) {}

  async query({
    model,
    depth,
    where,
    mergeWhere,
    paginationOnly,
    forbiddenFields,
    primaryKey = 'id',
    setHeaders = true,
  }: {
    model: Prisma.ModelName;
    where?: any;
    depth?: number;
    primaryKey?: string;
    mergeWhere?: boolean;
    setHeaders?: boolean;
    paginationOnly?: boolean;
    forbiddenFields?: string[];
  }): Promise<Partial<QueryResponse>> {
    return this.querybuilder
      .query(primaryKey, depth, setHeaders, forbiddenFields)
      .then(async (query) => {
        if (where) query.where = mergeWhere ? { ...query.where, ...where } : where;

        if (setHeaders) {
          const count = await this.prisma[model].count({ where: query.where });
          this.request.res.setHeader('count', count);
        }

        if (paginationOnly) {
          delete query.include;
          delete query.select;
        }

        return { ...query };
      })
      .catch((err) => {
        if (err.response?.message) throw new BadRequestException(err.response?.message);
        throw new BadRequestException('Internal error processing your query string, check your parameters');
      });
  }
}
```

---

### Parâmetros da Query String

Models Prisma de exemplo usados na documentação abaixo

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]

  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  published Boolean? @default(false)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
  content   Content[]

  @@map("posts")
}

model Content {
  id     Int    @id @default(autoincrement())
  text   String
  post   Post   @relation(fields: [postId], references: [id])
  postId Int

  @@map("contents")
}
```

#### Page e Limit

A paginação está sempre habilitada. Se não forem enviados `page` e `limit`, o padrão é página 1 com 10 itens.

Os headers da resposta conterão `count` (total de itens) e `page` (número da página atual).

```
GET /posts?page=2&limit=10
```

#### Sort


| Propriedade | Obrigatório | Descrição                        |
| ----------- | ----------- | -------------------------------- |
| `field`     | sim         | O campo para ordenar             |
| `criteria`  | não         | `asc` ou `desc` (default: `asc`) |


```
GET /posts?sort[field]=title&sort[criteria]=desc
```

Para ordenação por múltiplas colunas, passe `sort` como array indexado:

```
GET /posts?sort[0][field]=publishedAt&sort[0][criteria]=desc&sort[1][field]=title&sort[1][criteria]=asc
```

Isso gera `orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }]`. O formato de objeto simples continua totalmente suportado.

#### Select

Campos separados por **espaço em branco, vírgula ou ponto e vírgula**.

- Por padrão, se nenhum `select` for enviado, somente o campo `id` é retornado.
- Use `select=all` para retornar o objeto inteiro.
- Ao selecionar um campo de relacionamento, o objeto relacionado inteiro é retornado. Para selecionar campos específicos de uma relação, use `populate`. Para obter apenas a chave estrangeira, use a coluna FK diretamente (ex: `authorId`).
- Ao usar `forbiddenFields`, `select=all` é ignorado.

```
GET /posts?select=id title,published;authorId
```

#### Distinct

Campos separados por **espaço em branco, vírgula ou ponto e vírgula**.

```
GET /posts?distinct=title published
```

#### Populate

Populate é um array que permite selecionar campos específicos de modelos relacionados.


| Propriedade  | Obrigatório | Descrição                                                                                                             |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `path`       | sim         | O nome do relacionamento (ex: `author`)                                                                               |
| `select`     | sim         | Campos a retornar (separados por espaço/vírgula/ponto e vírgula). `select=all` **não** é suportado dentro do populate |
| `primaryKey` | não         | Chave primária da relação (default: `id`)                                                                             |
| `populate`   | não         | Populate aninhado para relações mais profundas                                                                        |
| `filter`     | não         | `FilterFields[]` para filtrar os registros relacionados                                                               |


Use o índice do array para ligar `path` e `select`:

```
GET /posts?populate[0][path]=author&populate[0][select]=name email
```

**Populate aninhado** (relações dentro de relações):

```
GET /users?populate[0][path]=posts&populate[0][select]=title&populate[0][populate][0][path]=content&populate[0][populate][0][select]=text
```

**Filtro dentro do populate** (filtrar os registros relacionados):

```
GET /users?populate[0][path]=posts&populate[0][select]=title published&populate[0][filter][0][path]=published&populate[0][filter][0][value]=true&populate[0][filter][0][type]=boolean
```

Ao usar `select=all` junto com `populate`, a biblioteca usa o `include` do Prisma ao invés de `select`, retornando todos os campos do model junto com as relações populadas.

#### Filter

Filter é um array que constrói a cláusula `where` do Prisma.


| Propriedade            | Obrigatório | Descrição                                                                                                                                                                                         |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`                 | sim         | O campo para filtrar                                                                                                                                                                              |
| `value`                | sim*        | O valor para filtrar (*opcional quando usando `filter` aninhado)                                                                                                                                  |
| `type`                 | não         | Tipo do valor: `string` (default), `boolean`, `number`, `date`, `object`. O tipo `object` aceita `null` ou `undefined`                                                                            |
| `operator`             | não         | Operador Prisma: `contains`, `endsWith`, `startsWith`, `equals`, `gt`, `gte`, `in`, `lt`, `lte`, `not`, `notIn`, `hasEvery`, `hasSome`, `has`, `isEmpty`                                          |
| `filterGroup`          | não         | Agrupa filtros com operadores lógicos do Prisma: `and`, `or`, `not`                                                                                                                               |
| `insensitive`          | não         | `'true'` ou `'false'` (default: `'false'`). Veja [Prisma case sensitivity](https://www.prisma.io/docs/concepts/components/prisma-client/case-sensitivity#database-collation-and-case-sensitivity) |
| `filter`               | não         | `FilterFields[]` para filtros aninhados/em relações                                                                                                                                               |
| `filterInsideOperator` | não         | Operador de relação do Prisma para filtros aninhados: `none`, `some`, `every`                                                                                                                     |


Os operadores `in`, `notIn`, `hasEvery` e `hasSome` aceitam múltiplos valores separados por **vírgula ou ponto e vírgula**:

```
GET /posts?filter[0][path]=title&filter[0][operator]=in&filter[0][value]=foo,bar,baz
```

Filtros simples:

```
GET /posts?filter[0][path]=title&filter[0][value]=querybuilder
GET /posts?filter[0][path]=published&filter[0][value]=true&filter[0][type]=boolean
```

Usando `filterGroup`:

```
GET /posts?filter[0][path]=title&filter[0][value]=querybuilder&filter[0][filterGroup]=and&filter[1][path]=published&filter[1][value]=true&filter[1][type]=boolean&filter[1][filterGroup]=and
```

**Filtro aninhado** (filtrar em modelos relacionados):

```
GET /posts?filter[0][path]=author&filter[0][filter][0][path]=name&filter[0][filter][0][value]=John
```

**filterInsideOperator** (operadores de relação do Prisma com filtros aninhados):

```
GET /posts?filter[0][path]=author&filter[0][filter][0][path]=name&filter[0][filter][0][value]=John&filter[0][filter][0][filterInsideOperator]=some
```

---

### QueryResponse

O método `query()` retorna um objeto `Partial<QueryResponse>` pronto para ser passado a qualquer chamada `findMany` do Prisma:

```typescript
interface QueryResponse {
  where: any;
  orderBy?: any;
  skip?: number;
  take?: number;
  distinct?: string[];
  select?: Record<string, boolean>;
  include?: Record<string, any>;
}
```

`QueryResponse` é exportado pelo pacote e pode ser importado diretamente:

```typescript
import { QueryResponse } from 'nestjs-prisma-querybuilder';
```

---

### Segurança

Como a query string é controlada pelo frontend, qualquer campo do banco pode potencialmente ser solicitado ou filtrado. Duas estratégias complementares são recomendadas:

**1. `forbiddenFields`** — Impede que campos sensíveis sejam selecionados, filtrados, ordenados ou populados:

```typescript
const query = await this.qb.query({
  model: 'User',
  forbiddenFields: ['password', 'refreshToken', 'resetCode'],
});
```

Quando `forbiddenFields` está definido, `select=all` é automaticamente ignorado, impedindo que o usuário contorne a restrição.

**2. DTOs de resposta com `plainToClass`** — Como segunda camada de defesa, transforme a resposta do Prisma através de um DTO antes de devolvê-la ao cliente. Isso garante que, mesmo que um campo vaze pela query, ele será removido da resposta:

```typescript
import { plainToClass } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';

async findAll() {
  const query = await this.qb.query({
    model: 'User',
    forbiddenFields: ['password', 'refreshToken'],
  });

  const users = await this.prisma.user.findMany(query);
  return users.map((user) => plainToClass(UserResponseDto, user, { excludeExtraneousValues: true }));
}
```

Usar ambas as abordagens juntas garante defesa em profundidade: `forbiddenFields` impede que o dado seja consultado, e o DTO impede que seja retornado.

---

### Limitações

- `select=all` **não** é suportado dentro de `populate` — funciona apenas no nível raiz.
- Filtros aninhados em níveis profundos dentro de `populate` podem não funcionar completamente.
- O parâmetro `depth` controla a profundidade de parsing do `qs` (default: `5`). Se suas queries forem muito aninhadas, pode ser necessário aumentar esse valor.

---

### Interface para o Frontend

Você pode usar o pacote complementar para construir query strings mais facilmente no frontend:

**[nestjs-prisma-querybuilder-interface](https://www.npmjs.com/package/nestjs-prisma-querybuilder-interface)**