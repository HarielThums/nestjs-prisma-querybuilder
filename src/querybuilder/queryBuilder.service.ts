import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryResponse } from './dto/queryResponse.dto';
import { Querybuilder } from './queryBuilder';

type WhereInput<TPrisma, TModel extends keyof TPrisma> = TPrisma[TModel] extends { findMany: (args: infer A) => any }
  ? A extends { where?: infer W }
    ? W
    : never
  : never;

// Pass your PrismaClient type to enable typed `model` and `where`: QuerybuilderService<PrismaClient>
// Without it, both default to loosely typed — no breaking change.
@Injectable()
export class QuerybuilderService<TPrisma extends Record<string, any> = Record<string, any>> {
  constructor(
    readonly querybuilder: Querybuilder,
    private readonly prisma: TPrisma,
    private readonly onQuery?: (query: Record<string, any>) => Record<string, any>,
    private readonly maxTake?: number
  ) {}

  /**
   * @param model model name on schema.prisma
   * @param primaryKey primary key field name for this model (default: 'id')
   * @param where object for 'where' using Prisma rules
   * @param mergeWhere if true, merges with the query string where; if false, replaces it
   * @param paginationOnly removes any 'select' and 'include' from the query
   * @param setHeaders adds 'count' and 'page' response headers
   * @param depth limits the qs parsing depth (default: 5)
   * @param forbiddenFields fields removed from any select/filter/populate/sort/distinct
   */
  async query<TModel extends string & keyof TPrisma>({
    model,
    depth,
    where,
    mergeWhere,
    paginationOnly,
    forbiddenFields,
    primaryKey = 'id',
    setHeaders = true
  }: {
    model: TModel;
    where?: WhereInput<TPrisma, TModel>;
    depth?: number;
    primaryKey?: string;
    mergeWhere?: boolean;
    setHeaders?: boolean;
    paginationOnly?: boolean;
    forbiddenFields?: string[];
  }): Promise<Partial<QueryResponse>> {
    if (!this.prisma[model]) {
      throw new BadRequestException(`Model "${model}" not found in PrismaClient`);
    }

    return this.querybuilder
      .query(primaryKey, depth, setHeaders, forbiddenFields)
      .then(async (query) => {
        if (where) query.where = mergeWhere ? { ...query.where, ...(where as object) } : where;

        if (this.maxTake && query.take > this.maxTake) query.take = this.maxTake;

        if (this.onQuery) query = this.onQuery({ ...query });

        if (setHeaders) {
          const count = await this.prisma[model].count({ where: query.where });

          this.querybuilder.request.res.setHeader('count', count);
          if (this.maxTake != null) this.querybuilder.request.res.setHeader('maxtake', this.maxTake);
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
