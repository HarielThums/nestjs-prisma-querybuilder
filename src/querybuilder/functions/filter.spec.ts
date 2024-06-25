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
});
