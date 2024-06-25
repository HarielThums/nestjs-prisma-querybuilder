import { sort } from './sort.fn';

describe('sort', () => {
  it('should add orderBy to the query and remove sort if sort field is not forbidden', () => {
    const query = { sort: { field: 'name', criteria: 'asc' } };

    const forbiddenFields = ['age'];

    const result = sort(query, forbiddenFields);

    expect(result.orderBy).toStrictEqual({ name: 'asc' });
    expect(result.sort).toBeUndefined();
  });

  it('should not add orderBy to the query if sort field is forbidden', () => {
    const query = { sort: { field: 'age', criteria: 'asc' } };

    const forbiddenFields = ['age'];

    const result = sort(query, forbiddenFields);

    expect(result.orderBy).toBeUndefined();
    expect(result.sort).toBeUndefined();
  });

  it('should not modify the query if sort is not defined', () => {
    const query = { select: 'all' };

    const result = sort(query, []);

    expect(result).toStrictEqual(query);
  });
});
