import { select } from './select.fn';

describe('select', () => {
  it('should add primaryKey to select if it is defined', () => {
    const query = {};

    const result = select(query, 'id', []);

    expect(result.select.id).toBeDefined();
  });

  it('should return the same query if select is not defined', () => {
    const query = { sort: { field: 'age', criteria: 'asc' } };

    const result = select({ ...query }, 'id', []);

    expect(result.select.id).toBeDefined();
    expect(result).toStrictEqual({ ...query, select: { id: true } });
  });

  it('should not add forbiddenFields to select', () => {
    const query = { select: 'id,field1,forbiddenField' };

    const result = select(query, 'id', ['forbiddenField']);

    expect(result.select.id).toBeDefined();
    expect(result.select.field1).toBeDefined();
    expect(result.select.forbiddenField).toBeUndefined();
  });

  it('should not add all if forbiddenField is not empty', () => {
    const query = { select: 'id,all,forbiddenField' };

    const result = select(query, 'id', ['forbiddenField']);

    expect(result.select.id).toBeDefined();
    expect(result.select.all).toBeUndefined();
    expect(result.select.forbiddenField).toBeUndefined();
  });

  it('should add all if forbiddenField is empty', () => {
    const query = { select: 'id,all,forbiddenField' };

    const result = select(query, 'id', []);

    expect(result.select.id).toBeDefined();
    expect(result.select.all).toBeDefined();
    expect(result.select.forbiddenField).toBeDefined();
  });

  it('should add fields from query.select to select', () => {
    const query = { select: 'id,field1' };

    const result = select(query, 'id', []);

    expect(result.select.id).toBeDefined();
    expect(result.select.field1).toBeDefined();
  });

  it('should handle multiple delimiters in query.select', () => {
    const query = { select: 'id;field1,field2 field3' };

    const result = select(query, 'id', []);

    expect(result.select.id).toBeDefined();
    expect(result.select.field1).toBeDefined();
    expect(result.select.field2).toBeDefined();
    expect(result.select.field3).toBeDefined();
  });
});
