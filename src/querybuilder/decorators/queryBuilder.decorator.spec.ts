import { Inject } from '@nestjs/common';
import { InjectQuerybuilder } from './queryBuilder.decorator';
import { QUERYBUILDER_DEFAULT, getQuerybuilderToken } from '../constants/queryBuilder.constants';

jest.mock('@nestjs/common', () => ({
  Inject: jest.fn((token) => `decorator_for_${String(token)}`)
}));

describe('InjectQuerybuilder', () => {
  it('should return whatever Inject() returns', () => {
    const result = InjectQuerybuilder();
    expect(result).toBeDefined();
  });

  it('should call Inject with QUERYBUILDER_DEFAULT when no name is provided', () => {
    InjectQuerybuilder();
    expect(Inject).toHaveBeenCalledWith(QUERYBUILDER_DEFAULT);
  });

  it('should call Inject with QUERYBUILDER_DEFAULT when name is undefined', () => {
    InjectQuerybuilder(undefined);
    expect(Inject).toHaveBeenCalledWith(QUERYBUILDER_DEFAULT);
  });

  it('should call Inject with namespaced token when name is provided', () => {
    InjectQuerybuilder('db2');
    expect(Inject).toHaveBeenCalledWith(getQuerybuilderToken('db2'));
  });

  it('should produce different tokens for different names', () => {
    InjectQuerybuilder('db1');
    expect(Inject).toHaveBeenCalledWith('QUERYBUILDER_SERVICE_db1');

    InjectQuerybuilder('db2');
    expect(Inject).toHaveBeenCalledWith('QUERYBUILDER_SERVICE_db2');
  });
});
