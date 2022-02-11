import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Querybuilder } from './queryBuilder.service';

@Module({})
export class QuerybuilderModule {
  static forRoot(prismaService: PrismaService) {
    const providers = [
      {
        provide: PrismaService,
        useValue: prismaService
      },
      Querybuilder
    ];

    return {
      providers: providers,
      exports: providers,
      module: QuerybuilderModule
    };
  }
}
