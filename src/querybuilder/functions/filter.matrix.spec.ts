import { filter } from './filter.fn';

/**
 * Matrix tests for `filter.fn` — exercises the `not` flag and list/type conversion
 * across every operator, type, filterGroup and nesting mode.
 */
describe('filter matrix', () => {
  const run = (f: Record<string, unknown> | Record<string, unknown>[], forbidden: string[] = []) => filter({ filter: f }, forbidden).where;

  describe('not flag × scalar operators', () => {
    it.each([
      ['contains', 'abc', { contains: 'abc' }],
      ['endsWith', 'abc', { endsWith: 'abc' }],
      ['startsWith', 'abc', { startsWith: 'abc' }],
      ['equals', 'abc', { equals: 'abc' }],
      ['gt', '5', { gt: '5' }],
      ['gte', '5', { gte: '5' }],
      ['lt', '5', { lt: '5' }],
      ['lte', '5', { lte: '5' }],
      ['not', 'abc', { not: 'abc' }]
    ])('operator "%s" with not=true → { not: %j }', (operator, value, inner) => {
      expect(run({ path: 'f', value, operator, not: 'true' })).toStrictEqual({ f: { not: inner } });
    });
  });

  describe('not flag × list operators', () => {
    it.each([
      ['in', 'a,b', { in: ['a', 'b'] }],
      ['notIn', 'a;b', { notIn: ['a', 'b'] }],
      ['in', ' a , b ', { in: ['a', 'b'] }],
      ['notIn', 'a,,b;', { notIn: ['a', 'b'] }]
    ])('operator "%s" with not=true splits then wraps → { not: %j }', (operator, value, inner) => {
      expect(run({ path: 'f', value, operator, not: 'true' })).toStrictEqual({ f: { not: inner } });
    });
  });

  describe('not flag × type conversion', () => {
    it.each([
      ['string', 'abc', 'contains', { contains: 'abc' }],
      ['number', '42', 'gt', { gt: 42 }],
      ['boolean', 'true', 'equals', { equals: true }],
      ['boolean', 'false', 'equals', { equals: false }],
      ['date', '2024-01-01', 'gte', { gte: new Date('2024-01-01') }],
      ['object', 'null', 'equals', { equals: null }]
    ])('type "%s" value "%s" converts inside not', (type, value, operator, inner) => {
      expect(run({ path: 'f', value, operator, type, not: 'true' })).toStrictEqual({ f: { not: inner } });
    });

    it.each([
      ['string', 'a,b', ['a', 'b']],
      ['number', '1,2,3', [1, 2, 3]],
      ['boolean', 'true;false', [true, false]],
      ['date', '2024-01-01,2024-02-01', [new Date('2024-01-01'), new Date('2024-02-01')]]
    ])('type "%s" list "%s" converts every item inside not', (type, value, list) => {
      expect(run({ path: 'f', value, operator: 'in', type, not: 'true' })).toStrictEqual({ f: { not: { in: list } } });
    });
  });

  describe('not flag × insensitive × filterGroup', () => {
    it.each([
      [undefined, 'true', { f: { not: { contains: 'x' }, mode: 'insensitive' } }],
      [undefined, 'false', { f: { not: { contains: 'x' } } }],
      [undefined, undefined, { f: { not: { contains: 'x' } } }],
      ['and', 'true', { AND: [{ f: { not: { contains: 'x' }, mode: 'insensitive' } }] }],
      ['or', 'true', { OR: [{ f: { not: { contains: 'x' }, mode: 'insensitive' } }] }],
      ['not', 'true', { NOT: [{ f: { not: { contains: 'x' }, mode: 'insensitive' } }] }],
      ['and', undefined, { AND: [{ f: { not: { contains: 'x' } } }] }]
    ])('filterGroup=%s insensitive=%s keeps mode outside not', (filterGroup, insensitive, expected) => {
      expect(run({ path: 'f', value: 'x', operator: 'contains', not: 'true', filterGroup, insensitive })).toStrictEqual(expected);
    });

    it('never places mode inside the not object', () => {
      const where = run({ path: 'f', value: 'x', operator: 'contains', not: 'true', insensitive: 'true' });

      expect(where.f.not).not.toHaveProperty('mode');
      expect(where.f.mode).toBe('insensitive');
    });
  });

  describe('not flag without operator', () => {
    it.each([
      ['string', 'draft', { not: 'draft' }],
      ['number', '7', { not: 7 }],
      ['boolean', 'false', { not: false }],
      ['object', 'null', { not: null }]
    ])('type "%s" negates plain equality → %j', (type, value, expected) => {
      expect(run({ path: 'f', value, type, not: 'true' })).toStrictEqual({ f: expected });
    });

    it('applies insensitive on negated equality', () => {
      expect(run({ path: 'f', value: 'x', not: 'true', insensitive: 'true' })).toStrictEqual({ f: { not: 'x', mode: 'insensitive' } });
    });

    it('inside a filterGroup without operator', () => {
      expect(run({ path: 'f', value: 'x', not: 'true', filterGroup: 'or' })).toStrictEqual({ OR: [{ f: { not: 'x' } }] });
    });

    it.each([
      ['boolean', 'false', { not: false }],
      ['number', '0', { not: 0 }],
      ['object', 'null', { not: null }]
    ])('falsy %s value inside a filterGroup is negated, not dropped', (type, value, expected) => {
      expect(run({ path: 'f', value, type, not: 'true', filterGroup: 'and' })).toStrictEqual({ AND: [{ f: expected }] });
    });
  });

  describe('not flag is a no-op when not "true"', () => {
    it.each([['false'], [undefined], [''], ['TRUE'], ['1']])('not=%j behaves like no flag', (not) => {
      const base = run({ path: 'f', value: 'x', operator: 'contains', insensitive: 'true' });
      const flagged = run({ path: 'f', value: 'x', operator: 'contains', insensitive: 'true', not });

      expect(flagged).toStrictEqual(base);
    });
  });

  describe('negation property: not=true wraps exactly the un-negated clause', () => {
    const cases: Record<string, unknown>[] = [
      { path: 'a', value: 'x' },
      { path: 'a', value: 'x', operator: 'contains' },
      { path: 'a', value: 'x', operator: 'contains', insensitive: 'true' },
      { path: 'a', value: '1,2', operator: 'in', type: 'number' },
      { path: 'a', value: 'true', operator: 'equals', type: 'boolean' },
      { path: 'a', value: '2024-05-05', operator: 'lt', type: 'date' },
      { path: 'a', value: 'null', operator: 'equals', type: 'object' },
      { path: 'a', value: 'x', operator: 'startsWith', filterGroup: 'and' },
      { path: 'a', value: 'x', operator: 'endsWith', filterGroup: 'or', insensitive: 'true' },
      { path: 'a', value: 'x', operator: 'gt', filterGroup: 'not' }
    ];

    const extract = (where: any, f: Record<string, unknown>) => {
      if (f.filterGroup) return where[(f.filterGroup as string).toUpperCase()][0][f.path as string];
      return where[f.path as string];
    };

    it.each(cases.map((c) => [JSON.stringify(c), c]))('%s', (_label, f) => {
      const base = extract(run({ ...f }), f);
      const negated = extract(run({ ...f, not: 'true' }), f);

      const { mode, ...inner } = typeof base === 'object' && base !== null && !(base instanceof Date) ? base : { mode: undefined, __raw: base };
      const expectedInner = '__raw' in inner ? inner.__raw : inner;

      expect(negated).toStrictEqual(mode ? { not: expectedInner, mode } : { not: expectedInner });
    });
  });

  describe('not flag × nesting', () => {
    it.each([['some'], ['every'], ['none']])('inside relation with filterInsideOperator=%s', (op) => {
      const where = run({ path: 'posts', filter: [{ path: 'title', value: 'x', operator: 'contains', not: 'true', filterInsideOperator: op }] });

      expect(where).toStrictEqual({ posts: { [op]: { title: { not: { contains: 'x' } } } } });
    });

    it('inside plain nested path (no filterInsideOperator)', () => {
      const where = run({ path: 'author', filter: [{ path: 'name', value: 'x', operator: 'startsWith', not: 'true' }] });

      expect(where).toStrictEqual({ author: { name: { not: { startsWith: 'x' } } } });
    });

    it('inside relation and inside a filterGroup at the same time', () => {
      const where = run({
        path: 'posts',
        filter: [
          { path: 'title', value: 'x', operator: 'contains', not: 'true', filterGroup: 'or', filterInsideOperator: 'some' },
          { path: 'status', value: 'draft', not: 'true', filterGroup: 'or', filterInsideOperator: 'some' }
        ]
      });

      expect(where).toStrictEqual({ posts: { some: { OR: [{ title: { not: { contains: 'x' } } }, { status: { not: 'draft' } }] } } });
    });

    it('two levels deep', () => {
      const where = run({
        path: 'author',
        filter: [{ path: 'posts', filter: [{ path: 'title', value: 'x', operator: 'endsWith', not: 'true', filterInsideOperator: 'every' }] }]
      });

      expect(where).toStrictEqual({ author: { posts: { every: { title: { not: { endsWith: 'x' } } } } } });
    });
  });

  describe('not flag × forbiddenFields', () => {
    it('drops a forbidden top-level path even with not=true', () => {
      const where = run(
        [
          { path: 'secret', value: 'x', operator: 'contains', not: 'true' },
          { path: 'ok', value: 'y', not: 'true' }
        ],
        ['secret']
      );

      expect(where).toStrictEqual({ ok: { not: 'y' } });
    });

    it('drops a forbidden nested path even with not=true', () => {
      const where = run(
        {
          path: 'author',
          filter: [
            { path: 'secret', value: 'x', not: 'true' },
            { path: 'name', value: 'y', not: 'true' }
          ]
        },
        ['secret']
      );

      expect(where).toStrictEqual({ author: { name: { not: 'y' } } });
    });

    it('drops a forbidden path inside a filterGroup even with not=true', () => {
      const where = run([{ path: 'secret', value: 'x', operator: 'contains', not: 'true', filterGroup: 'or' }], ['secret']);

      expect(where).toStrictEqual({});
    });
  });

  describe('mixed real-world shapes', () => {
    it('combines not, filterGroup, plain and list filters without leaking flags into where', () => {
      const where = run([
        { path: 'title', value: 'draft', operator: 'contains', not: 'true', filterGroup: 'or', insensitive: 'true' },
        { path: 'status', value: 'published', filterGroup: 'or' },
        { path: 'age', value: '18', type: 'number', operator: 'gte' },
        { path: 'tags', value: 'a,b', operator: 'notIn', not: 'true' },
        { path: 'deletedAt', value: 'null', type: 'object' }
      ]);

      expect(where).toStrictEqual({
        OR: [{ title: { not: { contains: 'draft' }, mode: 'insensitive' } }, { status: 'published' }],
        age: { gte: 18 },
        tags: { not: { notIn: ['a', 'b'] } },
        deletedAt: null
      });
      expect(where).not.toHaveProperty('not');
      expect(where).not.toHaveProperty('insensitive');
      expect(where).not.toHaveProperty('filterGroup');
    });

    it('double negation: not=true combined with filterGroup=not', () => {
      const where = run({ path: 'title', value: 'x', operator: 'contains', not: 'true', filterGroup: 'not' });

      expect(where).toStrictEqual({ NOT: [{ title: { not: { contains: 'x' } } }] });
    });

    it('same path negated twice in AND', () => {
      const where = run([
        { path: 'title', value: 'a', operator: 'contains', not: 'true', filterGroup: 'and' },
        { path: 'title', value: 'b', operator: 'contains', not: 'true', filterGroup: 'and' }
      ]);

      expect(where).toStrictEqual({ AND: [{ title: { not: { contains: 'a' } } }, { title: { not: { contains: 'b' } } }] });
    });

    it('removes filter from the query and leaves other keys alone', () => {
      const result = filter({ filter: { path: 'f', value: 'x', not: 'true' }, take: 5, skip: 0 }, []);

      expect(result).toStrictEqual({ where: { f: { not: 'x' } }, take: 5, skip: 0 });
    });
  });

  describe('list conversion (split before type conversion)', () => {
    it.each([
      ['number', '1,2', 'in', { in: [1, 2] }],
      ['number', '1;2;3', 'notIn', { notIn: [1, 2, 3] }],
      ['number', ' 10 , 20 ', 'in', { in: [10, 20] }],
      ['boolean', 'true,false,true', 'hasEvery', { hasEvery: [true, false, true] }],
      ['date', '2024-01-01;2024-12-31', 'in', { in: [new Date('2024-01-01'), new Date('2024-12-31')] }],
      ['string', '1,2', 'in', { in: ['1', '2'] }],
      [undefined, 'a, b ,c', 'hasSome', { hasSome: ['a', 'b', 'c'] }],
      ['number', '5', 'in', { in: [5] }]
    ])('type %s "%s" with %s → %j', (type, value, operator, expected) => {
      expect(run({ path: 'f', value, operator, type })).toStrictEqual({ f: expected });
    });

    it('drops empty items produced by trailing or doubled separators', () => {
      expect(run({ path: 'f', value: ',a,,b;', operator: 'in' })).toStrictEqual({ f: { in: ['a', 'b'] } });
    });

    it('keeps an empty list for an empty value', () => {
      expect(run({ path: 'f', value: '', operator: 'in' })).toStrictEqual({ f: { in: [] } });
    });

    it('keeps an empty list for a missing value', () => {
      expect(run({ path: 'f', operator: 'in', type: 'number' })).toStrictEqual({ f: { in: [] } });
    });

    it('does not split non-list operators on commas', () => {
      expect(run({ path: 'f', value: 'a,b', operator: 'contains' })).toStrictEqual({ f: { contains: 'a,b' } });
    });
  });
});
