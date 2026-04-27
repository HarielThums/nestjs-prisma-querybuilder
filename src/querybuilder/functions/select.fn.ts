/**
 * Builds the Prisma `select` clause from the query select parameter.
 * Accepts comma, semicolon, or space as field delimiters.
 * `select=all` with no forbidden fields signals that the full model should be returned (no select applied).
 * @param query - Query object containing an optional `select` string
 * @param primaryKey - Primary key field always included in the selection
 * @param forbiddenFields - Field names that must be excluded from selection
 * @returns The query object with `select` populated
 */
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
