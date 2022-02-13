import { Global, HttpException, Inject, Injectable } from '@nestjs/common';
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

  async query(): Promise<QueryResponse> {
    try {
      const queryValidator = defaultPlainToClass(QueryValidator, this.request.query);

      await defaultValidateOrReject(queryValidator);

      const query = this.buildQuery(queryValidator);

      // await this.setCount(model, query.where);

      return query;
    } catch (err) {
      throw new HttpException(err.response, err.response.statusCode);
    }
  }

  // private async setCount(model: string, where = {}) {
  //   const count = await model.count({ where }).catch(() => {
  //     throw new HttpException({ statusCode: 500, message: 'Prisma error on Querybuilder, check your query and types' }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   });

  //   this.request.res.setHeader('count', count);
  // }

  private buildQuery(query) {
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

    if (query.populate) {
      const select = {};

      const populate = [query.populate].flat();

      populate.forEach((value: PopulateFields) => {
        select[value.path] = {};

        select[value.path]['select'] = { id: true };
      });

      populate.forEach((value: PopulateFields, index) => {
        if (!populate[index].select) {
          select[value.path]['select'] = { id: true };
        } else if (populate[index].select) {
          populate[index].select.split(' ').map((v: string) => {
            select[value.path]['select'][v] = true;
          });
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

    query.select = { id: true, ...query.select };

    return plainToClass(QueryResponse, query);
  }
}
