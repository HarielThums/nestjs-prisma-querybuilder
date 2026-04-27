import { filter } from './filter.fn';

describe('filter', () => {
  it('should initialize where field in query if not present', () => {
    const query = {};

    const forbiddenFields = ['field1', 'field2'];

    const result = filter(query, forbiddenFields);

    expect(result).toHaveProperty('where');
  });

  it('should not include forbidden fields in where clause', () => {
    const query = {
      filter: [
        { path: 'field1', value: 'value1' },
        { path: 'field2', value: 'value2' },
        { path: 'field3', value: 'value3' }
      ]
    };

    const forbiddenFields = ['field1', 'field2'];

    const result = filter(query, forbiddenFields);

    expect(result.where).not.toHaveProperty('field1');
    expect(result.where).not.toHaveProperty('field2');
    expect(result.where).toHaveProperty('field3');
  });

  it('should delete filter field from query and have property where on result', () => {
    const query = { filter: [{ path: 'field1', value: 'value1' }] };

    const forbiddenFields = [];

    const result = filter(query, forbiddenFields);

    expect(result).toHaveProperty('where');
    expect(result).not.toHaveProperty('filter');
  });

  it('should handle filter field being an array or a single object', () => {
    const querySingle = { filter: { path: 'field1', value: 'value1' } };

    const queryArray = { filter: [{ path: 'field1', value: 'value1' }] };

    const forbiddenFields = [];

    const resultSingle = filter({ ...querySingle }, forbiddenFields);

    const resultArray = filter({ ...queryArray }, forbiddenFields);

    expect(resultSingle.where).toStrictEqual(resultArray.where);
  });

  describe('type conversion', () => {
    it('should convert boolean string "true" to boolean true', () => {
      const query = { filter: [{ path: 'active', value: 'true', type: 'boolean' }] };

      const result = filter(query, []);

      expect(result.where.active).toBe(true);
    });

    it('should convert boolean string "false" to boolean false', () => {
      const query = { filter: [{ path: 'active', value: 'false', type: 'boolean' }] };

      const result = filter(query, []);

      expect(result.where.active).toBe(false);
    });

    it('should convert number string to number', () => {
      const query = { filter: [{ path: 'age', value: '42', type: 'number' }] };

      const result = filter(query, []);

      expect(result.where.age).toBe(42);
    });

    it('should convert date string to Date object', () => {
      const isoDate = '2024-01-15T00:00:00.000Z';
      const query = { filter: [{ path: 'createdAt', value: isoDate, type: 'date' }] };

      const result = filter(query, []);

      expect(result.where.createdAt).toBeInstanceOf(Date);
      expect(result.where.createdAt.toISOString()).toBe(isoDate);
    });

    it('should convert object type "null" to null', () => {
      const query = { filter: [{ path: 'deletedAt', value: 'null', type: 'object' }] };

      const result = filter(query, []);

      expect(result.where.deletedAt).toBeNull();
    });
  });

  describe('operators', () => {
    it('should apply operator to field', () => {
      const query = { filter: [{ path: 'age', value: '18', type: 'number', operator: 'gte' }] };

      const result = filter(query, []);

      expect(result.where.age).toStrictEqual({ gte: 18 });
    });

    it('should split comma-separated values for "in" operator', () => {
      const query = { filter: [{ path: 'status', value: 'active,inactive,pending', operator: 'in' }] };

      const result = filter(query, []);

      expect(result.where.status).toStrictEqual({ in: ['active', 'inactive', 'pending'] });
    });

    it('should split semicolon-separated values for "notIn" operator', () => {
      const query = { filter: [{ path: 'role', value: 'admin;root', operator: 'notIn' }] };

      const result = filter(query, []);

      expect(result.where.role).toStrictEqual({ notIn: ['admin', 'root'] });
    });

    it('should apply insensitive mode when insensitive is "true"', () => {
      const query = { filter: [{ path: 'name', value: 'alice', operator: 'contains', insensitive: 'true' }] };

      const result = filter(query, []);

      expect(result.where.name).toStrictEqual({ contains: 'alice', mode: 'insensitive' });
    });

    it('should not apply insensitive mode when insensitive is "false"', () => {
      const query = { filter: [{ path: 'name', value: 'alice', operator: 'contains', insensitive: 'false' }] };

      const result = filter(query, []);

      expect(result.where.name).toStrictEqual({ contains: 'alice' });
    });
  });

  describe('filterGroup', () => {
    it('should add filter to AND array when filterGroup is "and"', () => {
      const query = {
        filter: [
          { path: 'age', value: '18', type: 'number', operator: 'gte', filterGroup: 'and' },
          { path: 'age', value: '65', type: 'number', operator: 'lte', filterGroup: 'and' }
        ]
      };

      const result = filter(query, []);

      expect(result.where.AND).toHaveLength(2);
      expect(result.where.AND[0]).toStrictEqual({ age: { gte: 18 } });
      expect(result.where.AND[1]).toStrictEqual({ age: { lte: 65 } });
    });

    it('should add filter to OR array when filterGroup is "or"', () => {
      const query = {
        filter: [
          { path: 'role', value: 'admin', filterGroup: 'or' },
          { path: 'role', value: 'moderator', filterGroup: 'or' }
        ]
      };

      const result = filter(query, []);

      expect(result.where.OR).toHaveLength(2);
      expect(result.where.OR[0]).toStrictEqual({ role: 'admin' });
      expect(result.where.OR[1]).toStrictEqual({ role: 'moderator' });
    });

    it('should add filter to NOT array when filterGroup is "not"', () => {
      const query = { filter: [{ path: 'status', value: 'banned', filterGroup: 'not' }] };

      const result = filter(query, []);

      expect(result.where.NOT).toHaveLength(1);
      expect(result.where.NOT[0]).toStrictEqual({ status: 'banned' });
    });

    it('should not add forbidden fields inside filterGroup', () => {
      const query = {
        filter: [
          { path: 'password', value: 'secret', filterGroup: 'and' },
          { path: 'name', value: 'alice', filterGroup: 'and' }
        ]
      };

      const result = filter(query, ['password']);

      expect(result.where.AND).toHaveLength(1);
      expect(result.where.AND[0]).toStrictEqual({ name: 'alice' });
    });
  });

  describe('type conversion (continued)', () => {
    it('should coerce value to string when type is "string"', () => {
      const query = { filter: [{ path: 'code', value: 42, type: 'string' }] };

      const result = filter(query, []);

      expect(result.where.code).toBe('42');
    });

    it('should set field to undefined when object type value is "undefined"', () => {
      const query = { filter: [{ path: 'meta', value: 'undefined', type: 'object' }] };

      const result = filter(query, []);

      expect(result.where.hasOwnProperty('meta')).toBe(true);
      expect(result.where.meta).toBeUndefined();
    });
  });

  describe('operators (continued)', () => {
    it('should split comma-separated values for "hasEvery" operator', () => {
      const query = { filter: [{ path: 'tags', value: 'a,b,c', operator: 'hasEvery' }] };

      const result = filter(query, []);

      expect(result.where.tags).toStrictEqual({ hasEvery: ['a', 'b', 'c'] });
    });

    it('should split comma-separated values for "hasSome" operator', () => {
      const query = { filter: [{ path: 'tags', value: 'x,y', operator: 'hasSome' }] };

      const result = filter(query, []);

      expect(result.where.tags).toStrictEqual({ hasSome: ['x', 'y'] });
    });
  });

  describe('nested filters (filterInsideOperator)', () => {
    // filterInsideOperator is declared on the CHILD filter, defining how the parent relation is scoped.
    // e.g. posts where SOME are published → parent path='posts', child path='published' + filterInsideOperator='some'
    it('should apply filterInsideOperator "some" on a relation field', () => {
      const query = {
        filter: [
          {
            path: 'posts',
            filter: [{ path: 'published', value: 'true', type: 'boolean', filterInsideOperator: 'some' }]
          }
        ]
      };

      const result = filter(query, []);

      expect(result.where.posts).toBeDefined();
      expect(result.where.posts.some).toBeDefined();
      expect(result.where.posts.some.published).toBe(true);
    });

    it('should apply filterInsideOperator "every" on a relation field', () => {
      const query = {
        filter: [
          {
            path: 'tags',
            filter: [{ path: 'active', value: 'true', type: 'boolean', filterInsideOperator: 'every' }]
          }
        ]
      };

      const result = filter(query, []);

      expect(result.where.tags.every).toBeDefined();
      expect(result.where.tags.every.active).toBe(true);
    });

    it('should build nested where without filterInsideOperator (plain path nesting)', () => {
      const query = {
        filter: [
          {
            path: 'profile',
            filter: [{ path: 'city', value: 'NYC' }]
          }
        ]
      };

      const result = filter(query, []);

      expect(result.where.profile).toBeDefined();
      expect(result.where.profile.city).toBe('NYC');
    });

    it('should apply filterInsideOperator "none" on a relation field', () => {
      const query = {
        filter: [
          {
            path: 'comments',
            filter: [{ path: 'spam', value: 'true', type: 'boolean', filterInsideOperator: 'none' }]
          }
        ]
      };

      const result = filter(query, []);

      expect(result.where.comments.none).toBeDefined();
      expect(result.where.comments.none.spam).toBe(true);
    });
  });
});
