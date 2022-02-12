import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Querybuilder } from './queryBuilder.service';

@Module({})
export class QuerybuilderModule {
  static async forRoot(prisma: PrismaService): Promise<DynamicModule> {
    const providers = [{ provide: PrismaService, useValue: prisma }, Querybuilder];

    return {
      providers: providers,
      exports: providers,
      module: QuerybuilderModule
    };
  }
}

// @Module({})
// export class QuerybuilderModule {
//   static async forRoot(): Promise<DynamicModule> {
//     const providers = [Querybuilder];

//     return {
//       providers: providers,
//       exports: providers,
//       module: QuerybuilderModule
//     };
//   }
// }
