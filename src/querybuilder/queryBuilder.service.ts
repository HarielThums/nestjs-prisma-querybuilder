import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryResponse } from './dto/queryResponse.dto';
import { Querybuilder } from './queryBuilder';

@Injectable()
export class QuerybuilderService {
  constructor(
    readonly querybuilder: Querybuilder,
    private readonly prisma: Record<string, any>
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
  async query({
    model,
    depth,
    where,
    mergeWhere,
    paginationOnly,
    forbiddenFields,
    primaryKey = 'id',
    setHeaders = true
  }: {
    model: string;
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

          this.querybuilder.request.res.setHeader('count', count);
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
