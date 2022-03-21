# Nestjs/prisma-querybuilder

#

![https://nestjs.com/img/logo_text.svg](https://nestjs.com/img/logo_text.svg)

- **Como instalar?**

  - `npm i @nestjs/prisma-query-builder`
  - No seu app.module inclua o `Querybuilder` aos providers:

    - `PrismaService` é o **seu** service, para ver como criar ele leia a documentação [@nestjs/prisma](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services)];

    ```tsx
    // app.module
    import { Querybuilder } from '@nestjs/prisma-query-builder';

    providers: [PrismaService, QuerybuilderService, Querybuilder],
    ```

    - `QuerybuilderService` vai ser o service que será usado nos seus métodos;

    ```tsx
    import { BadRequestException, Inject, Injectable } from '@nestjs/common';
    import { REQUEST } from '@nestjs/core';
    import { Querybuilder } from '@nestjs/prisma-query-builder';
    import { Request } from 'express';
    import { PrismaService } from 'src/prisma.service';

    @Injectable()
    export class QuerybuilderService {
      constructor(@Inject(REQUEST) private readonly request: Request, private readonly querybuilder: Querybuilder, private readonly prisma: PrismaService) {}

      async query(model: string) {
        return this.querybuilder
          .query()
          .then(async (query) => {
            const count = await this.prisma[model].count({ where: query.where });

            this.request.res.setHeader('count', count);

            return query;
          })
          .catch((err) => {
            if (err.response?.message) throw new BadRequestException(err.response?.message);

            throw new BadRequestException('Internal error processing your query string, check your parameters');
          });
      }
    }
    ```

  - Optional: Você pode adicionar uma validação adicional para o parametro `model`, mas essa validação vai variar de acordo com o seu database;

    - Exemplo com `SQLite`

      ```tsx
      if (!this.tables?.length) this.tables = await this.prisma.$queryRaw`SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';`;

      if (!this.tables.find((v) => v.name === model)) throw new BadRequestException('Invalid model');
      ```

- **Como usar?**

  - Adicione o Querybuilder no seu service:

    ```jsx
    import { Querybuilder } from '@nestjs/prisma-query-builder';

    // service
    constructor(private readonly prisma: PrismaService, private readonly qb: QuerybuilderService) {}
    ```

  - Configurando seu método:

    - o método `query` vai montar a query baseada no @Query(), mas o mesmo é pego direto do `REQUEST`, não sendo necessário passar como parâmetro;
    - o método `query` já vai adicionar no `Response.headers` a propriedade `count` que vai ter o total de objetos encontrados (usado para paginação);
    - o método `query` recebe uma **string** com o nome referente ao **model, isso** vai ser usado para fazer o count;

    ```jsx
      async UserExemple() {
        const query = await this.qb.query('user');

        return this.prisma.user.findMany(query);
      }
    ```

- **Parametros disponiveis**:

  - models de exemplo:

    ```jsx
    model User {
      id    Int     @default(autoincrement()) @id
      email String  @unique
      name  String?
      posts Post[]
    }

    model Post {
      id        Int      @default(autoincrement()) @id
      title     String
      published Boolean? @default(false)
      author    User?    @relation(fields: [authorId], references: [id])
      authorId  Int?
    }
    ```

  - Page e Limit
    - **Por padrão a páginação está sempre habilitada** e se não enviado `page` e `limit` na query, vai ser retornado página 1 com 10 itens;
    - Nos **headers** da **response** haverá a propriedade `count` com o total de itens a serem paginados;
    - `http://localhost:3000/posts?page=2&limit=10`
  - Sort
    - Para montar o sort são necessário enviar duas propriedades `sort` e `sortField`;
    - **sort** é um enum com [‘asc’, ‘desc’];
    - **sortField** é o campo pelo qual a ordenação vai ser aplicada;
    - `http://localhost:3000/posts?sort=asc&sortField=title`
  - Select
    - **Todas as propriedades devem ser separadas por espaço em branco;**
    - **Por padrão** se não for enviado nenhum **_select_** qualquer busca só irá retornar a propriedade `id`
    - Exceção: ao dar select em um relacionamento será retornado todo o objeto do relacionamento, para usar o select em um relacionamento use o `populate`, para buscar somente o `id` de um relacionamento é possível usar a coluna `authorId`
    - `http://localhost:3000/posts?select=title published authorId`
  - Populate
    - Populate é um array que permite dar select nos campos dos relacionamentos, é composto por 2 parametros, **path** e **select**;
    - `path` é a referencia para qual relacionamento será populado;
    - `select` são os campos que irão serem retornados;
    - Podem ser feitos todos os populates necessários usando o índice \*\*\*\*do array para ligar o path ao select;
    - `http://localhost:3000/posts?populate[0][path]=author&populate[0][select]=name email`
  - Filter
    - Pode ser usado para filtrar a consulta com os parâmetros desejados;
    - `path` é a referencia para qual propriedade irá aplicar o filtro;
    - `value` é o valor pelo qual vai ser filtrado;
    - `operator` (opcional) pode ser usado para personalizar a consulta;
      - recebe os tipos `['contains', 'endsWith', 'startsWith', 'equals', 'gt', 'gte', 'in', 'lt', 'lte', 'not', 'notIn']`
    - `type` é usado caso o valor do filter NÃO seja do tipo 'string'
      - recebe os tipos: `['string', 'boolean', 'number', 'date']`
    - filter é um array, podendo ser adicionados vários filtros de acordo com a necessidade da consulta;
    - consulta simples
      - `http://localhost:3000/posts?filter[0][path]=title&filter[0][value]=querybuilder&filter[1][path]=published&filter[1][value]=false`
      - `http://localhost:3000/posts?filter[1][path]=published&filter[1][value]=false&filter[1][type]=boolean`
  - Operator
    - Pode ser usado para montar o where usando os operadores [‘AND’, ‘OR’, ‘NOT’] ou nenhum operador;
    - `http://localhost:3000/posts?operator=and&filter[0][path]=title&filter[0][value]=querybuilder&filter[1][path]=published&filter[1][value]=false`

</br>

- Nestjs/Prisma Querybuilder is [MIT licensed](LICENSE).
