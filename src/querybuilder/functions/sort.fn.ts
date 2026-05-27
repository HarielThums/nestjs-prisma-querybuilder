/**
 * Builds the Prisma `orderBy` clause from the query sort parameter.
 * Accepts a single sort object or an array for multi-column ordering.
 * @param query - Query object containing an optional `sort` field
 * @param forbiddenFields - Field names that must be excluded from sorting
 * @returns The query object with `orderBy` populated and `sort` removed
 */
export const sort = (query, forbiddenFields: string[]) => {
  if (query.sort) {
    const sorts = Array.isArray(query.sort) ? query.sort : [query.sort];

    const orderBy = sorts.filter((s) => s.field && !forbiddenFields.includes(s.field)).map((s) => ({ [s.field]: s.criteria ?? 'asc' }));

    if (orderBy.length) query.orderBy = orderBy.length === 1 ? orderBy[0] : orderBy;

    delete query.sort;
  }

  return query;
};
