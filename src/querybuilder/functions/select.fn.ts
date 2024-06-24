export const select = (query, primaryKey: string, forbiddenFields: string[]) => {
  const select = {};

  if (primaryKey) select[primaryKey] = true;

  if (query.select) {
    query.select
      .split(/;|,|\s/g)
      .map((v: string) => v?.trim())
      .filter((v: string) => v && !forbiddenFields.includes(v))
      .map((v: string) => (select[v] = true));

    if (select.hasOwnProperty('all') && forbiddenFields?.length) delete select['all'];
  }

  query.select = select;

  return query;
};
