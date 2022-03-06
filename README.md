# Nestjs/prisma-querybuilder


![https://nestjs.com/img/logo_text.svg](https://nestjs.com/img/logo_text.svg)


- **Como instalar?**
    - `npm i @nestjs/prisma-query-builder`
    - No seu app.module inclua o `QuerybuilderModule` aos imports:
        - `PrismaService` é o **seu** service, para ver como criar ele leia a documentação [[@nestjs/prisma](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services)];
        
        ```jsx
        import { QuerybuilderModule } from '@nestjs/prisma-query-builder';
        
        // app.module
        imports: [QuerybuilderModule.forRoot(new PrismaService())],
        ```
        
- **Como usar?**
    - Adicione o Querybuilder no seu service:
        
        ```jsx
        import { Querybuilder } from '@nestjs/prisma-query-builder';
        
        // service
        constructor(private readonly prisma: PrismaService, private readonly qb: Querybuilder) {}
        ```
        
    - Configurando seu método:
        - o método `query` vai montar a query baseada no @Query(), mas o mesmo é pego direto do `REQUEST`, não sendo necessário passar como parametro;
        - o método `query` já vai setar no `Response.headers` a propriedade `count` que vai ter o total de objetos encontrados (usado para paginação);
        - o método `query` recebe uma **string** com o nome referente ao **model, isso** vai ser usado para fazer o count;
        
        ```jsx
          async UserExemple() {
            const query = await this.qb.query('user');
        
            return this.prisma.user.findMany({ ...query });
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
        - **Por padrão** se não for enviado nenhum ***select*** qualquer busca só irá retornar a propriedade `id`
        - Exceção: ao dar select em um relacionamento será retornado todo o objeto do relacionamento, para usar o select em um relacionamento use o `populate`, para buscar somente o `id` de um relacionamento é possivel usar a coluna `authorId`
        - `http://localhost:3000/posts?select=title published authorId`
    - Populate
        - Populate é um array que permite dar select nos campos dos relacionamentos, é composto por 2 parametros, **path** e **select**;
        - `path` é a referencia para qual relacionamento será populado;
        - `select` são os campos que irão serem retornados;
        - Podem ser feitos todos os populates necessários usando o indice do array para ligar o path ao select;
        - `http://localhost:3000/posts?populate[0][path]=author&populate[0][select]=name email`
    - Filter
        - 
    - Operator
        - Pode ser usado para montar o where usando os operadores [‘AND’, ‘OR’, ‘NOT’] ou nenhum operador;
        - Se não houver filter não irá causar nenhum efeito;
        - `http://localhost:3000/posts?operator=and&filter[0][path]=title&filter[0][value]=querybuilder&filter[1][path]=published&filter[1][value]=false`
        
- Nestjs/Prisma Querybuilder is [MIT licensed](LICENSE).
