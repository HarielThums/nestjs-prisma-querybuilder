import { populate } from './populate.fn';

describe('populate', () => {
  it('should return the same query if populate is not present', () => {
    const query = { select: { all: true } };

    const forbiddenFields = ['password'];

    expect(populate(query, forbiddenFields)).toStrictEqual(query);
  });

  it('should add select fields and filter if populate is present', () => {
    const query = { select: { all: true }, populate: [{ path: 'populate1', select: 'field1' }] };

    const forbiddenFields = ['password'];

    const result = populate(query, forbiddenFields);

    expect(result.select).toBeDefined();
    expect(result.select.populate1).toBeDefined();
  });

  it('should delete populate from the query', () => {
    const query = { select: { all: true }, populate: [{ path: 'populate1', select: 'field1' }] };

    const forbiddenFields = ['password'];

    const result = populate({ ...query }, forbiddenFields);

    expect(result.select).toBeDefined();
    expect(result.populate).toBeUndefined();
  });

  it('should not replace select with include if select has all property and forbiddenFields is not empty', () => {
    const query = { select: { all: true }, populate: [{ path: 'populate1', select: 'field1' }] };

    const forbiddenFields = ['password'];

    const result = populate(query, forbiddenFields);

    expect(result.select).toBeDefined();
    expect(result.include).toBeUndefined();
  });

  it('should replace select with include if select has all property and forbiddenFields is empty', () => {
    const query = { select: { all: true }, populate: [{ path: 'populate1', select: 'field1' }] };

    const forbiddenFields = [];

    const result = populate(query, forbiddenFields);

    expect(result.include).toBeDefined();
    expect(result.select).toBeUndefined();
  });

  it('should remove forbidden populate', () => {
    const query = {
      select: { username: true },
      populate: [
        { path: 'populate1', select: 'field1,field2' },
        { path: 'populate2', select: 'field1,field2' }
      ]
    };

    const forbiddenFields = ['populate2', 'field2'];

    const result = populate(query, forbiddenFields);

    expect(result.select).toBeDefined();
    expect(result.select.username).toBeDefined();
    expect(result.select.populate1).toBeDefined();
    expect(result.select.populate1.select.field1).toBeDefined();
    expect(result.select.populate1.select.field2).toBeUndefined();
    expect(result.select.populate2).toBeUndefined();
  });

  it('should remove forbiddenfields from select', () => {
    const query = { select: { username: true }, populate: [{ path: 'populate1', select: 'field1,field2' }] };

    const forbiddenFields = ['field2'];

    const result = populate(query, forbiddenFields);

    expect(result.select).toBeDefined();
    expect(result.select.username).toBeDefined();
    expect(result.select.populate1).toBeDefined();
    expect(result.select.populate1.select.field1).toBeDefined();
    expect(result.select.populate1.select.field2).toBeUndefined();
  });

  it('should merge select with the new select if select does not have all property', () => {
    const query = { select: { username: true }, populate: [{ path: 'populate1', select: 'field1' }] };

    const forbiddenFields = ['password'];

    const result = populate(query, forbiddenFields);

    expect(result.select).toBeDefined();
    expect(result.select.username).toBeDefined();
    expect(result.include).toBeUndefined();
  });

  it('should handle filter populate being an array or a single object', () => {
    const querySingle = { select: { username: true }, populate: [{ path: 'populate1', select: 'field1' }] };

    const queryArray = { select: { username: true }, populate: { path: 'populate1', select: 'field1' } };

    const forbiddenFields = [];

    const resultSingle = populate({ ...querySingle }, forbiddenFields);

    const resultArray = populate({ ...queryArray }, forbiddenFields);

    expect(resultSingle.select).toStrictEqual(resultArray.select);
  });
});
