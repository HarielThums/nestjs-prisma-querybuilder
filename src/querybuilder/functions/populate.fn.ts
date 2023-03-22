import { PopulateFields } from '../dto/populateFields.dto';
import { filter } from './filter.fn';

export const populate = (query) => {
  if (query.populate) {
    const select = {};

    const populate = [query.populate].flat();

    populate.forEach((value: PopulateFields) => {
      populateAddSelectPrimaryKey(select, value);
    });

    populate.forEach((value: PopulateFields, index) => {
      populateAddSelectFieldsAndFilter(select, populate, value, index);
    });

    delete query.populate;

    if (query.select?.hasOwnProperty('all')) {
      query.include = {};

      query.include = { ...select };

      delete query.select;
    } else {
      query.select = { ...query.select, ...select };
    }
  }

  return query;
};

const populateAddSelectPrimaryKey = (select, value: PopulateFields) => {
  select[value.path] = {};

  select[value.path]['select'] = { [value.primaryKey]: true };

  if (value.populate?.length) {
    value.populate.forEach((valueInside: PopulateFields) => {
      populateAddSelectPrimaryKey(select[value.path]['select'], valueInside);
    });
  }
};

const populateAddSelectFieldsAndFilter = (select, populate: PopulateFields[], value: PopulateFields, index: number) => {
  if (populate[index]?.select) {
    populate[index].select.split(' ').map((v: string) => {
      select[value.path]['select'][v] = true;
    });

    if (populate[index]?.populate?.length) {
      populate[index].populate.forEach((populateInside: PopulateFields, indexInside: number) => {
        populateAddSelectFieldsAndFilter(select[value.path]['select'], populate[index]['populate'], populateInside, indexInside);
      });
    }
  }

  // testar mais os níveis de filtro dentro do populate (ainda não está ok)
  if (value.filter) {
    const filterResponse = filter(value)?.where;

    if (filterResponse) select[value.path]['where'] = filterResponse;
  }
};
