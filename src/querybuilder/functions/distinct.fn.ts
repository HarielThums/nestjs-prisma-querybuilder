export const distinct = (query, forbiddenFields: string[]) => {
  if (query.distinct) {
    query.distinct = query.distinct
      .split(/;|,|\s/g)
      .map((v: string) => v?.trim())
      .filter((v: string) => v && !forbiddenFields.includes(v));
  }

  return query;
};
