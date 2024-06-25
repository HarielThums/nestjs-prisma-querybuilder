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
});
