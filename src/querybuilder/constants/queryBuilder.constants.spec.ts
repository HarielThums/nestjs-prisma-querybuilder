import { QUERYBUILDER_DEFAULT, getQuerybuilderToken } from './queryBuilder.constants';

describe('queryBuilder constants', () => {
  it('QUERYBUILDER_DEFAULT should be a non-empty string', () => {
    expect(typeof QUERYBUILDER_DEFAULT).toBe('string');
    expect(QUERYBUILDER_DEFAULT.length).toBeGreaterThan(0);
  });

  describe('getQuerybuilderToken', () => {
    it('should return QUERYBUILDER_DEFAULT when name is not provided', () => {
      expect(getQuerybuilderToken()).toBe(QUERYBUILDER_DEFAULT);
      expect(getQuerybuilderToken(undefined)).toBe(QUERYBUILDER_DEFAULT);
    });

    it('should return a namespaced token when name is provided', () => {
      expect(getQuerybuilderToken('db2')).toBe('QUERYBUILDER_SERVICE_db2');
    });

    it('should produce different tokens for different names', () => {
      expect(getQuerybuilderToken('db1')).not.toBe(getQuerybuilderToken('db2'));
    });
  });
});
