import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { Querybuilder } from './queryBuilder';

describe('Querybuilder', () => {
  let queryBuilder: Querybuilder;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockRequest = {
      query: {},
      res: { setHeader: jest.fn() } as unknown as any
    };
    queryBuilder = new Querybuilder(mockRequest as Request);
  });

  describe('paginate', () => {
    it('should set pagination correctly', async () => {
      const result = queryBuilder.buildQuery({ page: 3, limit: 5 }, 'id', false, []);

      expect(result).toHaveProperty('take', 5);
      expect(result).toHaveProperty('skip', 10);
    });

    it('should default page to 1 when page is 0', async () => {
      const result = queryBuilder.buildQuery({ page: 0, limit: 10 }, 'id', false, []);

      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });

    it('should default page to 1 when page is negative', async () => {
      const result = queryBuilder.buildQuery({ page: -5, limit: 10 }, 'id', false, []);

      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });

    it('should default limit to 10 when limit is 0', async () => {
      const result = queryBuilder.buildQuery({ page: 1, limit: 0 }, 'id', false, []);

      expect(result.take).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should coerce string page and limit to numbers', async () => {
      const result = queryBuilder.buildQuery({ page: '3', limit: '5' }, 'id', false, []);

      expect(result.skip).toBe(10);
      expect(result.take).toBe(5);
    });
  });

  describe('sort', () => {
    it('should apply sorting correctly', async () => {
      const result = queryBuilder.buildQuery({ sort: { field: 'name', criteria: 'desc' } }, 'id', false, []);

      expect(result).toHaveProperty('orderBy', { name: 'desc' });
    });
  });

  describe('distinct', () => {
    it('should apply distinct correctly', async () => {
      const result = queryBuilder.buildQuery({ distinct: 'name' }, 'id', false, []);

      expect(result).toHaveProperty('distinct', ['name']);
    });
  });

  describe('select', () => {
    it('should select fields correctly', async () => {
      const result = queryBuilder.buildQuery({ select: 'name,age' }, 'id', false, []);

      expect(result).toHaveProperty('select', { id: true, name: true, age: true });
    });

    it('should remove select when select=all and no forbiddenFields', async () => {
      const result = queryBuilder.buildQuery({ select: 'all' }, 'id', false, []);

      expect(result.select).toBeUndefined();
    });

    it('should keep select when select=all but forbiddenFields are set', async () => {
      const result = queryBuilder.buildQuery({ select: 'all' }, 'id', false, ['password']);

      expect(result.select).toBeDefined();
      expect(result.select.all).toBeUndefined();
    });
  });

  describe('populate', () => {
    it('should populate relations correctly without select all', async () => {
      const query = {
        populate: [
          { path: 'populate1', select: 'field1', primaryKey: 'id' },
          { path: 'populate2', select: 'field2', primaryKey: 'id' }
        ]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, []);

      expect(result).toHaveProperty('select', {
        id: true,
        populate1: { select: { id: true, field1: true } },
        populate2: { select: { id: true, field2: true } }
      });
    });

    it('should populate relations correctly with select all', async () => {
      const query = {
        select: 'all',
        populate: [
          { path: 'populate1', select: 'field1', primaryKey: 'id' },
          { path: 'populate2', select: 'field2', primaryKey: 'id' }
        ]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, []);

      expect(result).toHaveProperty('include', {
        populate1: { select: { id: true, field1: true } },
        populate2: { select: { id: true, field2: true } }
      });
    });
  });

  describe('filter', () => {
    it('should filter records correctly', async () => {
      const query = {
        filter: [
          { path: 'age', operator: 'gte', value: '20', type: 'number', filterGroup: 'and' },
          { path: 'age', operator: 'lte', value: '30', type: 'number', filterGroup: 'and' }
        ]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, []);

      expect(result).toHaveProperty('where', { AND: [{ age: { gte: 20 } }, { age: { lte: 30 } }] });
    });
  });

  describe('setHeaders', () => {
    it('should set page response header when setHeaders is true', async () => {
      queryBuilder.buildQuery({ page: 2, limit: 10 }, 'id', true, []);

      expect(mockRequest.res.setHeader).toHaveBeenCalledWith('page', 2);
    });

    it('should not set response header when setHeaders is false', async () => {
      queryBuilder.buildQuery({ page: 2, limit: 10 }, 'id', false, []);

      expect(mockRequest.res.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('forbiddenFields', () => {
    it('should exclude forbidden field from select', async () => {
      const result = queryBuilder.buildQuery({ select: 'name,password,email' }, 'id', false, ['password']);

      expect(result.select.name).toBe(true);
      expect(result.select.email).toBe(true);
      expect(result.select.password).toBeUndefined();
    });

    it('should always include primaryKey even when it is in forbiddenFields', async () => {
      const result = queryBuilder.buildQuery({ select: 'name' }, 'id', false, ['id']);

      expect(result.select.id).toBe(true);
      expect(result.select.name).toBe(true);
    });

    it('should exclude forbidden field from distinct', async () => {
      const result = queryBuilder.buildQuery({ distinct: 'name,secret,email' }, 'id', false, ['secret']);

      expect(result.distinct).toStrictEqual(['name', 'email']);
    });

    it('should not add orderBy when sort field is forbidden', async () => {
      const result = queryBuilder.buildQuery({ sort: { field: 'secret', criteria: 'asc' } }, 'id', false, ['secret']);

      expect(result.orderBy).toBeUndefined();
    });

    it('should exclude forbidden field from filter', async () => {
      const result = queryBuilder.buildQuery({ filter: [{ path: 'secret', value: 'value' }] }, 'id', false, ['secret']);

      expect(result.where).toStrictEqual({});
    });

    it('should partially block a filterGroup, letting allowed fields through', async () => {
      const query = {
        filter: [
          { path: 'secret', value: 'x', filterGroup: 'and' },
          { path: 'name', value: 'alice', filterGroup: 'and' }
        ]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, ['secret']);

      expect(result.where.AND).toHaveLength(1);
      expect(result.where.AND[0]).toStrictEqual({ name: 'alice' });
    });

    it('should block entire populate relation when path is forbidden', async () => {
      const query = {
        populate: [
          { path: 'posts', select: 'title', primaryKey: 'id' },
          { path: 'secret', select: 'data', primaryKey: 'id' }
        ]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, ['secret']);

      expect(result.select.posts).toBeDefined();
      expect(result.select.secret).toBeUndefined();
    });

    it('should exclude forbidden field from nested populate select', async () => {
      const query = {
        populate: [{ path: 'user', select: 'name,password,email', primaryKey: 'id' }]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, ['password']);

      expect(result.select.user.select.name).toBe(true);
      expect(result.select.user.select.email).toBe(true);
      expect(result.select.user.select.password).toBeUndefined();
    });

    it('should block forbidden field across select, distinct, sort and filter simultaneously', async () => {
      const query = {
        select: 'name,secret',
        distinct: 'name,secret',
        sort: { field: 'secret', criteria: 'asc' },
        filter: [{ path: 'secret', value: 'x' }]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, ['secret']);

      expect(result.select.secret).toBeUndefined();
      expect(result.distinct).not.toContain('secret');
      expect(result.orderBy).toBeUndefined();
      expect(result.where).toStrictEqual({});
    });

    it('should populate relations correctly when populate path is forbidden', async () => {
      const query = {
        populate: [
          { path: 'populate1', select: 'field1', primaryKey: 'id' },
          { path: 'populate2', select: 'field2', primaryKey: 'id' }
        ]
      };

      const result = queryBuilder.buildQuery(query, 'id', false, ['populate1']);

      expect(result).toHaveProperty('select', {
        id: true,
        populate2: { select: { id: true, field2: true } }
      });
    });
  });

  describe('query (async entry point)', () => {
    it('should process a valid query and return the correct shape', async () => {
      mockRequest.query = { select: 'name,age', page: '1', limit: '5' } as any;

      const result = await queryBuilder.query('id', 5, false, []);

      expect(result.select).toStrictEqual({ id: true, name: true, age: true });
      expect(result.take).toBe(5);
      expect(result.skip).toBe(0);
    });

    it('should apply custom primaryKey passed to query()', async () => {
      mockRequest.query = { select: 'name' } as any;

      const result = await queryBuilder.query('_id', 5, false, []);

      expect(result.select._id).toBe(true);
      expect(result.select.id).toBeUndefined();
      expect(result.select.name).toBe(true);
    });

    it('should throw BadRequestException when sort criteria is invalid', async () => {
      mockRequest.query = { sort: { field: 'name', criteria: 'INVALID' } } as any;

      await expect(queryBuilder.query()).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when filter operator is invalid', async () => {
      mockRequest.query = { filter: [{ path: 'name', value: 'x', operator: 'INVALID_OP' }] } as any;

      await expect(queryBuilder.query()).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('integration', () => {
    it('should return base shape for empty query', async () => {
      const result = queryBuilder.buildQuery({}, 'id', false, []);

      expect(result.take).toBe(10);
      expect(result.skip).toBe(0);
      expect(result.select).toStrictEqual({ id: true });
      expect(result.where).toStrictEqual({});
    });

    it('should handle complex queries correctly', async () => {
      const query = {
        page: '1',
        limit: '10',
        distinct: 'age',
        select: 'name,age',
        sort: { criteria: 'asc', field: 'age' },
        filter: { path: 'age', operator: 'gte', value: '20', type: 'number' },
        populate: [{ path: 'populate1', select: 'field1,field2', primaryKey: 'id' }]
      };

      const result = queryBuilder.buildQuery(query, 'id', true, ['field2']);

      expect(result).toEqual({
        distinct: ['age'],
        include: undefined,
        orderBy: { age: 'asc' },
        select: { age: true, id: true, name: true, populate1: { select: { field1: true, id: true } } },
        skip: 0,
        take: 10,
        where: { age: { gte: 20 } }
      });
    });
  });
});
