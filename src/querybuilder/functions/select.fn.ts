export const select = (query, primaryKey?: string) => {
  const select = {};

  if (primaryKey) select[primaryKey] = true;

  if (query.select) {
    query.select
      .split(' ')
      .map((v: string) => (v[0] === ' ' ? v.substring(1, v.length) : v))
      .filter((v: string) => v !== '')
      .map((v: string) => (select[v] = true));
  }

  query.select = select;

  return query;
};
