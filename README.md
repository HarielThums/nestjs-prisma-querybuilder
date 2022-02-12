<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

## Nestjs/Prisma Querybuilder

<br/>

- **How can i install it?**

  - `npm i @nestjs/prisma-query-builder`
  - in your app.module include 'QuerybuilderModule to imports: (`PrismaService` is your Service, to see how can you create it, read [@nestjs/prisma documentation](https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services))

    ```.
    import { QuerybuilderModule } from 'nestjs-prisma-query-builder';


    imports: [QuerybuilderModule.forRoot(new PrismaService())],
    ```

<br/>

- **How can i use it?**

  - Configure your service:

    ```
      constructor(private readonly prisma: PrismaService, private readonly qb: Querybuilder) {}
    ```

  - Configure your method:

    ```
      async UserExemple() {
        const query = await this.qb.query('user');

        return this.prisma.user.findMany({ ...query });
      }
    ```

  - :

  - **Select**

    ```
    teste?

    ```

</br>
- Nestjs/Prisma Querybuilder is [MIT licensed](LICENSE).
