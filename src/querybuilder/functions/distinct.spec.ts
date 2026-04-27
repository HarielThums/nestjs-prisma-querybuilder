import { distinct } from './distinct.fn';

describe('distinct', () => {
  it('should return the same query if distinct is not defined', () => {
    const query = { otherField: 'value' };

    const forbiddenFields = ['field1', 'field2'];

    const result = distinct({ ...query }, forbiddenFields);

    expect(result).toStrictEqual(query);
  });

  it('should filter out forbidden fields from distinct', () => {
    const query = { distinct: 'field1 field2 field3' };

    const forbiddenFields = ['field1', 'field2'];

    const result = distinct({ ...query }, forbiddenFields);

    expect(result.distinct).toStrictEqual(['field3']);
  });

  it('should trim and filter out empty values from distinct', () => {
    const query = { distinct: 'field1  field2  ' };

    const forbiddenFields = [];

    const result = distinct({ ...query }, forbiddenFields);

    expect(result.distinct).toStrictEqual(['field1', 'field2']);
  });

  it('should handle comma-separated fields', () => {
    const query = { distinct: 'field1,field2,field3' };

    const result = distinct({ ...query }, []);

    expect(result.distinct).toStrictEqual(['field1', 'field2', 'field3']);
  });

  it('should handle semicolon-separated fields', () => {
    const query = { distinct: 'field1;field2;field3' };

    const result = distinct({ ...query }, []);

    expect(result.distinct).toStrictEqual(['field1', 'field2', 'field3']);
  });

  it('should return empty array when all fields are forbidden', () => {
    const query = { distinct: 'field1 field2' };

    const result = distinct({ ...query }, ['field1', 'field2']);

    expect(result.distinct).toStrictEqual([]);
  });

  it('should handle a single field without any delimiter', () => {
    const query = { distinct: 'username' };

    const result = distinct({ ...query }, []);

    expect(result.distinct).toStrictEqual(['username']);
  });
});
