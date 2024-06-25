import { PopulateFields } from '../dto/populateFields.dto';
import { filter } from './filter.fn';

interface SelectI {
  [key: string]: boolean | SelectI;
}

export const populate = (query, forbiddenFields: string[]) => {
  if (query.populate) {
    const select: SelectI = {};

    const populate = [query.populate].flat().filter((v) => !forbiddenFields.includes(v.path));

    populate.forEach((value: PopulateFields) => {
      populateAddSelectPrimaryKey(select, value);
    });

    populate.forEach((value: PopulateFields, index) => {
      populateAddSelectFieldsAndFilter(select, populate, value, index, forbiddenFields);
    });

    delete query.populate;

    if (query.select?.hasOwnProperty('all') && !forbiddenFields?.length) {
      query.include = {};

      query.include = { ...select };

      delete query.select;
    } else {
      query.select = { ...query.select, ...select };
    }
  }

  return query;
};

const populateAddSelectPrimaryKey = (select: SelectI, value: PopulateFields) => {
  select[value.path] = {};

  select[value.path]['select'] = { [value.primaryKey]: true };

  if (value.populate?.length) {
    value.populate.forEach((valueInside: PopulateFields) => {
      populateAddSelectPrimaryKey(select[value.path]['select'], valueInside);
    });
  }
};

const populateAddSelectFieldsAndFilter = (select: SelectI, populate: PopulateFields[], value: PopulateFields, index: number, forbiddenFields: string[]) => {
  if (populate[index]?.select) {
    populate[index].select.split(/;|,|\s/g).map((v: string) => {
      if (v === 'all' && forbiddenFields?.length) {
        return;
      }

      if (forbiddenFields.includes(v)) {
        return;
      }

      select[value.path]['select'][v] = true;
    });

    if (populate[index]?.populate?.length) {
      populate[index].populate.forEach((populateInside: PopulateFields, indexInside: number) => {
        populateAddSelectFieldsAndFilter(select[value.path]['select'], populate[index]['populate'], populateInside, indexInside, forbiddenFields);
      });
    }
  }

  // testar mais os níveis de filtro dentro do populate (ainda não está ok)
  if (value.filter) {
    const filterResponse = filter(value, forbiddenFields)?.where;

    if (filterResponse) select[value.path]['where'] = filterResponse;
  }
};
