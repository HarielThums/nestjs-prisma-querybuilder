/**
 * Builds the Prisma `distinct` clause from the query distinct parameter.
 * Accepts comma, semicolon, or space as field delimiters.
 * @param query - Query object containing an optional `distinct` string
 * @param forbiddenFields - Field names that must be excluded from distinct
 * @returns The query object with `distinct` as a string array
 */
export const distinct = (query, forbiddenFields: string[]) => {
  if (query.distinct) {
    query.distinct = query.distinct
      .split(/;|,|\s/g)
      .map((v: string) => v?.trim())
      .filter((v: string) => v && !forbiddenFields.includes(v));
  }

  return query;
};
