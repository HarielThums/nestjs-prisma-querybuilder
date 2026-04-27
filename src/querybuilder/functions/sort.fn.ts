/**
 * Builds the Prisma `orderBy` clause from the query sort parameter.
 * @param query - Query object containing an optional `sort` object with `field` and `criteria` ('asc'|'desc')
 * @param forbiddenFields - Field names that must be excluded from sorting
 * @returns The query object with `orderBy` populated and `sort` removed
 */
export const sort = (query, forbiddenFields: string[]) => {
  if (query.sort) {
    if (!forbiddenFields.includes(query.sort.field)) {
      query.orderBy = {};

      query.orderBy[query.sort.field] = query.sort.criteria;
    }

    delete query.sort;
  }

  return query;
};
