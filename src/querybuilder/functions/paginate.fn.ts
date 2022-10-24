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
