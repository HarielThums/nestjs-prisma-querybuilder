export const select = (query) => {
  if (query.select) {
    const select = {};

    query.select.split(' ').map((v: string) => {
      select[v] = true;
    });

    query.select = select;
  }

  return query;
};
