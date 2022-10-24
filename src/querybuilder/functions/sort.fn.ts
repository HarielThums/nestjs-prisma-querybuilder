export const sort = (query) => {
  if (query.sort) {
    query.orderBy = {};

    query.orderBy[query.sort.field] = query.sort.criteria;

    delete query.sort;
  }

  return query;
};
