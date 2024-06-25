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
});
