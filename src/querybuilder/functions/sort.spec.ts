import { sort } from './sort.fn';

describe('sort', () => {
  describe('single sort (backward compat)', () => {
    it('should add orderBy to the query and remove sort if sort field is not forbidden', () => {
      const query = { sort: { field: 'name', criteria: 'asc' } };

      const result = sort(query, ['age']);

      expect(result.orderBy).toStrictEqual({ name: 'asc' });
      expect(result.sort).toBeUndefined();
    });

    it('should not add orderBy to the query if sort field is forbidden', () => {
      const query = { sort: { field: 'age', criteria: 'asc' } };

      const result = sort(query, ['age']);

      expect(result.orderBy).toBeUndefined();
      expect(result.sort).toBeUndefined();
    });

    it('should not modify the query if sort is not defined', () => {
      const query = { select: 'all' };

      const result = sort(query, []);

      expect(result).toStrictEqual(query);
    });

    it('should default criteria to asc when not provided', () => {
      const query = { sort: { field: 'name' } };

      const result = sort(query, []);

      expect(result.orderBy).toStrictEqual({ name: 'asc' });
    });
  });

  describe('multiple sort (array)', () => {
    it('should build orderBy as array when multiple sort entries are provided', () => {
      const query = { sort: [{ field: 'publishedAt', criteria: 'desc' }, { field: 'title', criteria: 'asc' }] };

      const result = sort(query, []);

      expect(result.orderBy).toStrictEqual([{ publishedAt: 'desc' }, { title: 'asc' }]);
      expect(result.sort).toBeUndefined();
    });

    it('should filter out forbidden fields from the array', () => {
      const query = { sort: [{ field: 'publishedAt', criteria: 'desc' }, { field: 'secret', criteria: 'asc' }] };

      const result = sort(query, ['secret']);

      expect(result.orderBy).toStrictEqual({ publishedAt: 'desc' });
    });

    it('should not set orderBy when all array fields are forbidden', () => {
      const query = { sort: [{ field: 'secret', criteria: 'asc' }] };

      const result = sort(query, ['secret']);

      expect(result.orderBy).toBeUndefined();
      expect(result.sort).toBeUndefined();
    });

    it('should unwrap array to single object when only one entry remains after filtering', () => {
      const query = { sort: [{ field: 'title', criteria: 'asc' }] };

      const result = sort(query, []);

      expect(result.orderBy).toStrictEqual({ title: 'asc' });
    });
  });
});
