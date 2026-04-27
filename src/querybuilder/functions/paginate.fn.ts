/**
 * Builds the Prisma `skip` and `take` parameters from the query pagination parameters.
 * @param query - Query object containing `page` and `limit` (already coerced to numbers)
 * @returns The query object with `skip` and `take` populated and `page`/`limit` removed
 */
export const paginate = (query) => {
  if (query.page) {
    query.skip = (query.page - 1) * query.limit;

    delete query.page;
  }

  if (query.limit) {
    query.take = query.limit;

    delete query.limit;
  }

  return query;
};
