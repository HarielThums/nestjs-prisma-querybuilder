export const select = (query, primaryKey: string, forbiddenFields: string[]) => {
  const select = {};

  if (primaryKey) select[primaryKey] = true;

  if (query.select) {
    query.select
      .split(' ')
      .map((v: string) => v?.trim())
      .filter((v: string) => v && !forbiddenFields.includes(v))
      .map((v: string) => (select[v] = true));
  }

  query.select = select;

  return query;
};
