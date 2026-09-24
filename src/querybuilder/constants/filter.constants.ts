export const FILTER_OPERATORS = [
  'contains',
  'endsWith',
  'startsWith',
  'equals',
  'gt',
  'gte',
  'in',
  'lt',
  'lte',
  'not',
  'notIn',
  'hasEvery',
  'hasSome',
  'has',
  'isEmpty'
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/** Operators whose value is a comma/semicolon separated list. */
export const LIST_OPERATORS: readonly FilterOperator[] = ['in', 'notIn', 'hasEvery', 'hasSome'];

/**
 * Operators of Prisma scalar-list filters (`String[]`, `Int[]`...).
 * Those filters have no `not` key, so the `not` flag cannot be combined with them.
 */
export const SCALAR_LIST_OPERATORS: readonly FilterOperator[] = ['has', 'hasEvery', 'hasSome', 'isEmpty'];
