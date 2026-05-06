import { DynamicModule, FactoryProvider, ForwardReference, Module, ModuleMetadata, Provider, Type } from '@nestjs/common';
import { QuerybuilderService } from './queryBuilder.service';
import { Querybuilder } from './queryBuilder';
import { QUERYBUILDER_DEFAULT, getQuerybuilderToken } from './constants/queryBuilder.constants';

type ExportableToken = string | symbol | Provider | Type | DynamicModule | ForwardReference;

export interface QuerybuilderModuleOptions {
  prisma: Record<string, any>;
  maxTake?: number;
  onQuery?: (query: Record<string, any>) => Record<string, any>;
}

export interface QuerybuilderModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  global?: boolean;
  inject?: FactoryProvider['inject'];
  useFactory: (...args: unknown[]) => QuerybuilderModuleOptions | Promise<QuerybuilderModuleOptions>;
}

@Module({})
export class QuerybuilderModule {
  static forRootAsync(options: QuerybuilderModuleAsyncOptions): DynamicModule {
    const token = getQuerybuilderToken(options.name);

    const isDefault = !options.name;

    const namedProvider: Provider = {
      provide: token,
      useFactory: async (qb: Querybuilder, ...args: unknown[]) => {
        const opts = await options.useFactory(...args);
        return new QuerybuilderService(qb, opts.prisma, opts.onQuery, opts.maxTake);
      },
      inject: [Querybuilder, ...(options.inject ?? [])]
    };

    const providers: Provider[] = [Querybuilder, namedProvider];
    const exports: ExportableToken[] = [Querybuilder, token];

    if (isDefault) {
      providers.push({ provide: QuerybuilderService, useExisting: QUERYBUILDER_DEFAULT });

      exports.push(QuerybuilderService);
    }

    return {
      module: QuerybuilderModule,

      global: options.global ?? true,
      imports: options.imports ?? [],

      providers,
      exports
    };
  }
}
