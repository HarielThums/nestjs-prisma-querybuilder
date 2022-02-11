import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { plainToClass } from 'class-transformer';
import { Request } from 'express';
import { defaultPlainToClass } from '../functions/plainToClass.fn';
import validateOrRejectPadrao from '../functions/validateOrReject.fn';
import { QueryResponse } from './dto/queryResponse.dto';
import { FilterFields, PopulateFields, QueryValidator } from './dto/queryValidator.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Querybuilder {
  constructor(@Inject(REQUEST) private readonly request: Request, private readonly prisma: PrismaService) {}

  async query(model: string): Promise<QueryResponse> {
    await validateOrRejectPadrao(defaultPlainToClass(QueryValidator, this.request.query));

    const query = this.buildQuery(defaultPlainToClass(QueryValidator, this.request.query));

    await this.setCount(model, query.where);

    return query;
  }

  private async setCount(model: string, where = {}) {
    const count = await this.prisma[model].count({ where });

    this.request.res.setHeader('count', count);
  }

  private buildQuery(query) {
    if (query.sort && query.sortField) {
      query.orderBy = {};

      query.orderBy[query.sortField] = query.sort;

      delete query.sort;
      delete query.sortField;
    }

    if (query.page) {
      query.page = query.page > 0 ? query.page : 1;

      query.skip = Number(query.page - 1) * Number(query.limit || 10);

      delete query.page;
    }

    if (query.limit) {
      query.limit = query.limit > 0 ? query.limit : 10;

      query.take = Number(query.limit);

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
        if (operator) {
          where[operator].push({ [value.path]: value.value });
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
