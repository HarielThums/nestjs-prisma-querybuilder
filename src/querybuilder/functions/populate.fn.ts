import { PopulateFields } from '../dto/populateFields.dto';
import { filter } from './filter.fn';

export const populate = (query) => {
  if (query.populate) {
    const select = {};

    const populate = [query.populate].flat();

    populate.forEach((value: PopulateFields) => {
      select[value.path] = {};

      select[value.path]['select'] = { [value.primaryKey]: true };

      if (value.populate) {
        value.populate.forEach((valueInside: PopulateFields) => {
          select[value.path]['select'][valueInside.path] = {};

          select[value.path]['select'][valueInside.path]['select'] = { [value.primaryKey]: true };
        });
      }
    });

    populate.forEach((value: PopulateFields, index) => {
      if (populate[index].select) {
        populate[index].select.split(' ').map((v: string) => {
          select[value.path]['select'][v] = true;
        });

        if (populate[index].populate) {
          populate[index].populate.forEach((valueInside: PopulateFields) => {
            valueInside.select.split(' ').map((v: string) => {
              select[value.path]['select'][valueInside.path]['select'][v] = true;
            });
          });
        }
      }

      if (value.filter) {
        const filterResponse = filter(value)?.where;

        if (filterResponse) select[value.path]['where'] = filterResponse;
      }
    });

    delete query.populate;

    if (query.select?.hasOwnProperty('all')) {
      query.include = {};

      query.include = { ...select };
    } else {
      query.select = { ...query.select, ...select };
    }
  }

  return query;
};
