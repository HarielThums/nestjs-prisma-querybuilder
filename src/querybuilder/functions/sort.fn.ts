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
