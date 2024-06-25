import { Request } from 'express';
import { Querybuilder } from './queryBuilder.service';

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

  it('should set pagination correctly', async () => {
    const query = { page: 3, limit: 5 };

    const result = queryBuilder.buildQuery(query, 'id', false, []);

    expect(result).toHaveProperty('take', 5);
    expect(result).toHaveProperty('skip', 10);
  });

  it('should apply sorting correctly', async () => {
    const query = { sort: { field: 'name', criteria: 'desc' } };

    const result = queryBuilder.buildQuery(query, 'id', false, []);

    expect(result).toHaveProperty('orderBy', { name: 'desc' });
  });

  it('should apply distinct correctly', async () => {
    const query = { distinct: 'name' };

    const result = queryBuilder.buildQuery(query, 'id', false, []);

    expect(result).toHaveProperty('distinct', ['name']);
  });

  it('should select fields correctly', async () => {
    const query = { select: 'name,age' };

    const result = queryBuilder.buildQuery(query, 'id', false, []);

    expect(result).toHaveProperty('select', { id: true, name: true, age: true });
  });

  it('should select all fields correctly', async () => {
    const query = { select: 'all' };

    const result = queryBuilder.buildQuery(query, 'id', false, []);

    expect(result).toHaveProperty('select', undefined);
  });

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

  it('should populate relations correctly without select all but with forbiddenFields', async () => {
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
