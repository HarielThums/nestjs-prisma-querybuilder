import { Global, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { plainToClass } from 'class-transformer';
import { Request } from 'express';
import { defaultPlainToClass } from '../functions/plainToClass.fn';
import defaultValidateOrReject from '../functions/validateOrReject.fn';
import { QueryResponse } from './dto/queryResponse.dto';
import { FilterFields, PopulateFields, QueryValidator } from './dto/queryValidator.dto';

@Global()
@Injectable()
export class Querybuilder {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  async query(primaryKey = 'id'): Promise<QueryResponse> {
    const queryValidator = defaultPlainToClass(QueryValidator, this.request.query);

    await defaultValidateOrReject(queryValidator);

    const query = this.buildQuery(queryValidator, primaryKey);

    return query;
  }

  private buildQuery(query, primaryKey: string) {
    query.page = Number(query.page) > 0 ? Number(query.page) : 1;
    query.limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

    this.request.res.setHeader('page', query.page);

    if (query.sort && query.sortField) {
      query.orderBy = {};

      query.orderBy[query.sortField] = query.sort;

      delete query.sort;
      delete query.sortField;
    }

    if (query.page) {
      query.skip = (query.page - 1) * query.limit;

      delete query.page;
    }

    if (query.limit) {
      query.take = query.limit;

      delete query.limit;
    }

    if (query.select) {
      const select = {};

      query.select.split(' ').map((v: string) => {
        select[v] = true;
      });

      query.select = select;
    }

    if (query.include) {
      const include = {};

      query.include.split(' ').map((v: string) => {
        include[v] = true;
      });

      query.include = include;
    }

    if (query.populate) {
      const select = {};

      const populate = [query.populate].flat();

      populate.forEach((value: PopulateFields) => {
        select[value.path] = {};

        select[value.path]['select'] = { [primaryKey]: true };

        if (value.populate) {
          value.populate.forEach((valueInside: PopulateFields) => {
            select[value.path]['select'][valueInside.path] = {};

            select[value.path]['select'][valueInside.path]['select'] = { [primaryKey]: true };
          });
        }
      });

      populate.forEach((value: PopulateFields, index) => {
        if (populate[index].select) {
          populate[index].select.split(' ').map((v: string) => {
            select[value.path]['select'][v] = true;
          });

          if (populate[index].populate) {
            populate[index].populate.forEach((valueInside: PopulateFields) => {
              valueInside.select.split(' ').map((v: string) => {
                select[value.path]['select'][valueInside.path]['select'][v] = true;
              });
            });
          }
        }
      });

      delete query.populate;

      query.select = { ...query.select, ...select };
    }

    if (query.filter) {
      const operator = query?.operator?.toUpperCase();
      const where = {};

      if (operator) {
        where[operator] = [];
      }

      const filter = [query.filter].flat();

      filter.forEach((value: FilterFields) => {
        if (value.type) {
          switch (value.type) {
            case 'date': {
              value.value = new Date(value.value);
              break;
            }
            case 'boolean': {
              value.value = value.value === 'true' ? true : false;
              break;
            }
            case 'number': {
              value.value = parseInt(value.value);
              break;
            }
          }
        }

        if (operator) {
          if (value.operator) {
            where[operator].push({ [value.path]: { [value.operator]: value.value } });
          } else {
            where[operator].push({ [value.path]: value.value });
          }
        } else if (value.operator) {
          where[value.path] = { [value.operator]: value.value };
        } else {
          where[value.path] = value.value;
        }
      });

      delete query.filter;

      query.where = { ...where };
    }

    if (query.operator) {
      delete query.operator;
    }

    query.select = { [primaryKey]: true, ...query.select };

    return plainToClass(QueryResponse, query);
  }
}
