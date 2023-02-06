import { FilterFields } from '../dto/filterFields.dto';

export const filter = (query) => {
  query['where'] = {};

  if (query.filter) {
    const filter = [query.filter].flat();

    filter.forEach((value: FilterFields) => whereAddFilters(value, query['where']));
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
    }
  }

  return value.value;
};

const whereAddFilters = (value: FilterFields, where) => {
  if (!where['OR']) where['OR'] = [];
  if (!where['NOT']) where['NOT'] = [];
  if (!where['AND']) where['AND'] = [];

  if (value?.value) value.value = filterConvertDataType(value);

  const insensitive = value.insensitive === 'true' ? { mode: 'insensitive' } : undefined;

  if (value?.operator && ['hasEvery', 'hasSome'].includes(value.operator)) {
    value.value = String(value.value)
      .split(';')
      .map((v) => (v[0] === ' ' ? v.substring(1, v.length) : v));
  }

  if (value?.filterGroup) {
    if (value.operator) {
      where[value.filterGroup.toUpperCase()]?.push({ [value.path]: { [value.operator]: value.value, ...insensitive } });
    } else {
      where[value.filterGroup.toUpperCase()]?.push({ [value.path]: value.value });
    }
  } else if (value.operator) {
    where[value.path] = { [value.operator]: value.value, ...insensitive };
  } else {
    where[value.path] = value.value;
  }

  if (value?.filter?.length) {
    if (!where[value.path]) where[value.path] = {};

    value.filter.forEach((filter) => {
      if (filter.filterInsideOperator) {
        if (!where[value.path][filter.filterInsideOperator]) where[value.path][filter.filterInsideOperator] = {};

        whereAddFilters(filter, where[value.path][filter.filterInsideOperator]);
      } else {
        whereAddFilters(filter, where[value.path]);
      }
    });
  }

  if (!where.OR.length) delete where.OR;
  if (!where.NOT.length) delete where.NOT;
  if (!where.AND.length) delete where.AND;
};
