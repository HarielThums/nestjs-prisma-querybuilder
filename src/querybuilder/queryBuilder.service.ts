import { Global, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { plainToClass } from 'class-transformer';
import { Request } from 'express';
import { inspect } from 'util';
import { defaultPlainToClass } from '../utils/functions/plainToClass.fn';
import defaultValidateOrReject from '../utils/functions/validateOrReject.fn';
import { QueryResponse } from './dto/queryResponse.dto';
import { QueryValidator } from './dto/queryValidator.dto';
import { filter } from './functions/filter.fn';
import { paginate } from './functions/paginate.fn';
import { populate } from './functions/populate.fn';
import { select } from './functions/select.fn';
import { sort } from './functions/sort.fn';
import * as qs from 'qs';

@Global()
@Injectable()
export class Querybuilder {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * @param primaryKey PrimaryKey from model selected, default is '_id_'
   * @param depth **QS depth definition**: The depth limit helps mitigate abuse when qs is used to parse user input, and it is recommended to keep it a reasonably small number. default is '_5_'
   * @returns {Promise<QueryResponse>} This will return your query to prisma
   * @seemore https://github.com/HarielThums/nestjs-prisma-querybuilder
   */
  async query(primaryKey = 'id', depth = 5): Promise<QueryResponse> {
    const requestQueryParsed = qs.parse(qs.stringify(this.request.query), { depth: depth });

    const queryValidator = defaultPlainToClass(QueryValidator, requestQueryParsed);

    await defaultValidateOrReject(queryValidator);

    const query = this.buildQuery(queryValidator, primaryKey);

    return query;
  }

  private buildQuery(query, primaryKey: string) {
    query.page = Number(query.page) > 0 ? Number(query.page) : 1;
    query.limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

    this.request.res.setHeader('page', query.page);

    query = sort(query);

    query = paginate(query);

    query = select(query, primaryKey);

    query = populate(query);

    query = filter(query);

    if (query.select?.hasOwnProperty('all')) delete query.select;

    return plainToClass(QueryResponse, query, { excludeExtraneousValues: true });
  }
}
