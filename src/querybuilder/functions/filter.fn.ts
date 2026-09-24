import { LIST_OPERATORS } from '../constants/filter.constants';
import { FilterFields } from '../dto/filterFields.dto';

/**
 * Builds the Prisma `where` clause from query filter parameters.
 * @param query - Query object containing an optional `filter` array or single filter object
 * @param forbiddenFields - Field names that must be excluded from filtering
 * @returns The query object with `where` populated and `filter` removed
 */
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

const isListOperator = (operator?: string) => !!operator && (LIST_OPERATORS as readonly string[]).includes(operator);

/**
 * Converts `value.value` according to `value.type`.
 * List operators (`in`, `notIn`, `hasEvery`, `hasSome`) split on comma/semicolon and convert each item.
 */
const convertValue = (value: FilterFields) => {
  if (isListOperator(value.operator)) {
    return String(value.value ?? '')
      .split(/;|,/g)
      .map((v) => v.trim())
      .filter((v) => v)
      .map((v) => filterConvertDataType({ ...value, value: v }));
  }

  return filterConvertDataType({ ...value, value: value.value });
};

/**
 * Builds the condition assigned to a field:
 * - no operator: the plain value (`{ title: 'x' }`)
 * - operator: `{ [operator]: value, mode? }`
 * - `not: 'true'`: wraps the condition in Prisma's `not` — `{ not: { [operator]: value }, mode? }`
 *   (`mode` is only valid on the outer filter, never inside `not`).
 */
const buildFieldClause = (value: FilterFields, insensitive?: { mode: string }) => {
  const negate = value.not === 'true' && (value.operator || value.value !== undefined);

  if (negate) return { not: value.operator ? { [value.operator]: value.value } : value.value, ...insensitive };

  return value.operator ? { [value.operator]: value.value, ...insensitive } : value.value;
};

const whereAddFilters = (value: FilterFields, where, forbiddenFields: string[]) => {
  if (forbiddenFields.includes(value.path)) return undefined;

  if (!where['OR']) where['OR'] = [];
  if (!where['NOT']) where['NOT'] = [];
  if (!where['AND']) where['AND'] = [];

  if (value?.value || isListOperator(value?.operator)) value.value = convertValue(value);

  const insensitive = value.insensitive === 'true' ? { mode: 'insensitive' } : undefined;
  const clause = buildFieldClause(value, insensitive);

  if (value?.filterGroup) {
    // `{}` only when there is nothing to match (relation parent carrying nested filters); falsy values (`false`, `0`, `null`) are kept
    where[value.filterGroup.toUpperCase()]?.push({ [value.path]: clause !== undefined ? clause : {} });
  } else {
    where[value?.path] = clause;
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
