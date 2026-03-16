# nestjs-prisma-querybuilder

[![npm version](https://img.shields.io/npm/v/nestjs-prisma-querybuilder.svg)](https://www.npmjs.com/package/nestjs-prisma-querybuilder)
[![license](https://img.shields.io/npm/l/nestjs-prisma-querybuilder.svg)](LICENSE)

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

### 1. Register the provider

```typescript
// app.module.ts
import { Querybuilder } from 'nestjs-prisma-querybuilder';

@Module({
  providers: [PrismaService, QuerybuilderService, Querybuilder],
})
export class AppModule {}
```

`PrismaService` is **your** service — see the official docs on how to create it: [@nestjs/prisma](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services).

### 2. Create your QuerybuilderService

This service wraps the library and adds count headers and model-level configuration. Copy it into your project and adjust as needed:

```typescript
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Querybuilder, QueryResponse, QueryValidator } from 'nestjs-prisma-querybuilder';
import { Request } from 'express';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class QuerybuilderService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly querybuilder: Querybuilder,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * @param model model name on schema.prisma
   * @param primaryKey primary key field name for this model (default: 'id')
   * @param where object for 'where' using Prisma rules
   * @param mergeWhere if true, merges with the query string where; if false, replaces it
   * @param justPaginate removes any 'select' and 'include' from the query
   * @param setHeaders adds 'count' and 'page' response headers
   * @param depth limits the qs parsing depth (default: 5)
   * @param forbiddenFields fields removed from any select/filter/populate/sort/distinct
   */
  async query({
    model,
    depth,
    where,
    mergeWhere,
    justPaginate,
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
    justPaginate?: boolean;
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

        if (justPaginate) {
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

### 3. Use it in any service

```typescript
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

### CORS

If your project has CORS configured, add **`count`** and **`page`** to your `exposedHeaders` so the frontend can read them.

---

## Query String Parameters

<details>
<summary>Example Prisma models used in the docs below</summary>

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

</details>

### Page and Limit

Pagination is always enabled. If the consumer doesn't send `page` and `limit`, it defaults to page 1 with 10 items.

The response headers will contain `count` (total items) and `page` (current page number).

```
GET /posts?page=2&limit=10
```

### Sort

| Property   | Required | Description |
|------------|----------|-------------|
| `field`    | yes      | The field to sort by |
| `criteria` | no       | `asc` or `desc` (default: `asc`) |

```
GET /posts?sort[field]=title&sort[criteria]=desc
```

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

| Property     | Required | Description |
|--------------|----------|-------------|
| `path`       | yes      | The relationship name (e.g. `author`) |
| `select`     | yes      | Fields to return (space/comma/semicolon separated). `select=all` is **not** supported inside populate |
| `primaryKey` | no       | Primary key of the relation (default: `id`) |
| `populate`   | no       | Nested populate for deeper relations |
| `filter`     | no       | `FilterFields[]` to filter the related records |

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

| Property              | Required | Description |
|-----------------------|----------|-------------|
| `path`                | yes      | The field to filter on |
| `value`               | yes*     | The value to filter by (*optional when using nested `filter`) |
| `type`                | no       | Value type: `string` (default), `boolean`, `number`, `date`, `object`. The `object` type accepts `null` or `undefined` |
| `operator`            | no       | Prisma operator: `contains`, `endsWith`, `startsWith`, `equals`, `gt`, `gte`, `in`, `lt`, `lte`, `not`, `notIn`, `hasEvery`, `hasSome`, `has`, `isEmpty` |
| `filterGroup`         | no       | Groups filters with Prisma logical operators: `and`, `or`, `not` |
| `insensitive`         | no       | `'true'` or `'false'` (default: `'false'`). See [Prisma case sensitivity](https://www.prisma.io/docs/concepts/components/prisma-client/case-sensitivity#database-collation-and-case-sensitivity) |
| `filter`              | no       | `FilterFields[]` for nested/relation filters |
| `filterInsideOperator`| no       | Prisma relation operator for nested filters: `none`, `some`, `every` |

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

<details>
<summary>Documentação em Português</summary>

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

#### 1. Registrar o provider

```typescript
// app.module.ts
import { Querybuilder } from 'nestjs-prisma-querybuilder';

@Module({
  providers: [PrismaService, QuerybuilderService, Querybuilder],
})
export class AppModule {}
```

`PrismaService` é o **seu** service — veja a documentação oficial para criá-lo: [@nestjs/prisma](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services).

#### 2. Criar o QuerybuilderService

Este service encapsula a biblioteca e adiciona headers de contagem e configurações por model. Copie para o seu projeto e ajuste conforme necessário:

```typescript
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Querybuilder, QueryResponse, QueryValidator } from 'nestjs-prisma-querybuilder';
import { Request } from 'express';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class QuerybuilderService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly querybuilder: Querybuilder,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * @param model nome do model no schema.prisma
   * @param primaryKey nome da chave primária deste model (default: 'id')
   * @param where objeto para where de acordo com as regras do Prisma
   * @param mergeWhere se true, mescla com o where da query string; se false, substitui
   * @param justPaginate remove qualquer 'select' e 'include' da query
   * @param setHeaders adiciona headers 'count' e 'page' na resposta
   * @param depth limita a profundidade de parsing do qs (default: 5)
   * @param forbiddenFields campos removidos de qualquer select/filter/populate/sort/distinct
   */
  async query({
    model,
    depth,
    where,
    mergeWhere,
    justPaginate,
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
    justPaginate?: boolean;
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

        if (justPaginate) {
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

#### 3. Usar em qualquer service

```typescript
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

Se o seu projeto tem CORS configurado, adicione **`count`** e **`page`** ao `exposedHeaders` para que o frontend consiga ler esses headers.

---

### Parâmetros da Query String

<details>
<summary>Models Prisma de exemplo usados na documentação abaixo</summary>

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

</details>

#### Page e Limit

A paginação está sempre habilitada. Se não forem enviados `page` e `limit`, o padrão é página 1 com 10 itens.

Os headers da resposta conterão `count` (total de itens) e `page` (número da página atual).

```
GET /posts?page=2&limit=10
```

#### Sort

| Propriedade | Obrigatório | Descrição |
|-------------|-------------|-----------|
| `field`     | sim         | O campo para ordenar |
| `criteria`  | não         | `asc` ou `desc` (default: `asc`) |

```
GET /posts?sort[field]=title&sort[criteria]=desc
```

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

| Propriedade  | Obrigatório | Descrição |
|--------------|-------------|-----------|
| `path`       | sim         | O nome do relacionamento (ex: `author`) |
| `select`     | sim         | Campos a retornar (separados por espaço/vírgula/ponto e vírgula). `select=all` **não** é suportado dentro do populate |
| `primaryKey` | não         | Chave primária da relação (default: `id`) |
| `populate`   | não         | Populate aninhado para relações mais profundas |
| `filter`     | não         | `FilterFields[]` para filtrar os registros relacionados |

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

| Propriedade            | Obrigatório | Descrição |
|------------------------|-------------|-----------|
| `path`                 | sim         | O campo para filtrar |
| `value`                | sim*        | O valor para filtrar (*opcional quando usando `filter` aninhado) |
| `type`                 | não         | Tipo do valor: `string` (default), `boolean`, `number`, `date`, `object`. O tipo `object` aceita `null` ou `undefined` |
| `operator`             | não         | Operador Prisma: `contains`, `endsWith`, `startsWith`, `equals`, `gt`, `gte`, `in`, `lt`, `lte`, `not`, `notIn`, `hasEvery`, `hasSome`, `has`, `isEmpty` |
| `filterGroup`          | não         | Agrupa filtros com operadores lógicos do Prisma: `and`, `or`, `not` |
| `insensitive`          | não         | `'true'` ou `'false'` (default: `'false'`). Veja [Prisma case sensitivity](https://www.prisma.io/docs/concepts/components/prisma-client/case-sensitivity#database-collation-and-case-sensitivity) |
| `filter`               | não         | `FilterFields[]` para filtros aninhados/em relações |
| `filterInsideOperator` | não         | Operador de relação do Prisma para filtros aninhados: `none`, `some`, `every` |

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

</details>
