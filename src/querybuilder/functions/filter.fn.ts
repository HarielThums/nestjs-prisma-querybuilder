import { FilterFields } from '../dto/filterFields.dto';

export const filter = (query, forbiddenFields: string[]) => {
  query['where'] = {};

  if (query.filter) {
    const filter = [query.filter].flat();

    filter
      .filter((value: FilterFields) => !forbiddenFields.includes(value.path))
      .forEach((value: FilterFields) => whereAddFilters(value, query['where'], forbiddenFields));
  }

  delete query?.filter;

  return query;
};

const filterConvertDataType = (value: FilterFields) => {
  if (value.type) {
    switch (value.type) {
      case 'date': {
        value.value = new Date(value.value);
        break;
      }
      case 'boolean': {
        value.value = value.value === 'true' ? true : false;
        break;
      }
      case 'number': {
        value.value = Number(value.value);
        break;
      }
      case 'object': {
        switch (value.value) {
          case 'null': {
            value.value = null;
            break;
          }
          case 'undefined': {
            value.value = undefined;
            break;
          }
        }
        break;
      }

      default: {
        value.value = String(value.value);
        break;
      }
    }
  }

  return value.value;
};

const whereAddFilters = (value: FilterFields, where, forbiddenFields: string[]) => {
  if (forbiddenFields.includes(value.path)) return undefined;

  if (!where['OR']) where['OR'] = [];
  if (!where['NOT']) where['NOT'] = [];
  if (!where['AND']) where['AND'] = [];

  if (value?.value) value.value = filterConvertDataType(value);

  const insensitive = value.insensitive === 'true' ? { mode: 'insensitive' } : undefined;

  if (value?.operator && ['in', 'notIn', 'hasEvery', 'hasSome'].includes(value.operator)) {
    value.value = String(value.value)
      .split(/;|,/g)
      .map((v) => v.trim())
      .filter((v) => v);
  }

  if (value?.filterGroup) {
    if (value.operator) {
      where[value.filterGroup.toUpperCase()]?.push({ [value.path]: { [value.operator]: value.value, ...insensitive } });
    } else {
      where[value.filterGroup.toUpperCase()]?.push({ [value.path]: value?.value ? value.value : {} });
    }
  } else if (value?.operator) {
    where[value.path] = { [value.operator]: value?.value, ...insensitive };
  } else {
    where[value?.path] = value.value;
  }

  if (value?.filter?.length) {
    if (!where[value.path] && !value?.filterGroup) where[value.path] = {};

    value.filter.forEach((filter) => {
      if (value?.filterGroup) {
        whereAddFilters(filter, where[value?.filterGroup?.toUpperCase()].find((v: [key: string]) => v[value.path])[value.path], forbiddenFields);
      } else if (filter.filterInsideOperator) {
        if (!where[value.path][filter.filterInsideOperator]) where[value.path][filter.filterInsideOperator] = {};

        whereAddFilters(filter, where[value.path][filter.filterInsideOperator], forbiddenFields);
      } else {
        whereAddFilters(filter, where[value.path], forbiddenFields);
      }
    });
  }

  if (!where.OR.length) delete where.OR;
  if (!where.NOT.length) delete where.NOT;
  if (!where.AND.length) delete where.AND;
};
