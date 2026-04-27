import { paginate } from './paginate.fn';

describe('paginate', () => {
  it('should calculate skip, limit and remove page from query', () => {
    const query = { page: 3, limit: 10 };

    const result = paginate(query);

    expect(result.skip).toStrictEqual(20);
    expect(result.take).toStrictEqual(10);

    expect(result.page).toBeUndefined();
    expect(result.limit).toBeUndefined();
  });

  it('should return the same query if page and limit are not defined', () => {
    const query = {};

    const result = paginate({ ...query });

    expect(result).toStrictEqual(query);
  });

  it('should produce skip=0 for page 1', () => {
    const query = { page: 1, limit: 10 };

    const result = paginate(query);

    expect(result.skip).toBe(0);
    expect(result.take).toBe(10);
  });

  it('should produce NaN skip when page is set but limit is absent (unit-level quirk, service always defaults limit)', () => {
    const result = paginate({ page: 2 });

    expect(Number.isNaN(result.skip)).toBe(true);
    expect(result.take).toBeUndefined();
  });

  it('should apply take even when page is not defined', () => {
    const query = { limit: 25 };

    const result = paginate(query);

    expect(result.take).toBe(25);
    expect(result.skip).toBeUndefined();
    expect(result.limit).toBeUndefined();
  });
});
