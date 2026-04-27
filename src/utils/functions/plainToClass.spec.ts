import 'reflect-metadata';
import { Expose } from 'class-transformer';
import { defaultPlainToClass } from './plainToClass.fn';

class SampleDto {
  @Expose()
  name: string;

  @Expose()
  age: number;

  unexposed: string;
}

describe('defaultPlainToClass', () => {
  it('should transform plain object into a class instance', () => {
    const result = defaultPlainToClass(SampleDto, { name: 'alice', age: 30 });

    expect(result).toBeInstanceOf(SampleDto);
  });

  it('should exclude fields not decorated with @Expose', () => {
    const result = defaultPlainToClass(SampleDto, { name: 'alice', unexposed: 'hidden' });

    expect(result.name).toBe('alice');
    expect(result.unexposed).toBeUndefined();
  });

  it('should not set fields absent from the source (exposeUnsetFields: false)', () => {
    const result = defaultPlainToClass(SampleDto, { name: 'alice' });

    expect(result.name).toBe('alice');
    expect(result.age).toBeUndefined();
  });

  it('should convert string to number via implicit conversion', () => {
    const result = defaultPlainToClass(SampleDto, { name: 'alice', age: '42' });

    expect(result.age).toBe(42);
  });

  it('should allow caller options to be merged with the defaults', () => {
    const result = defaultPlainToClass(SampleDto, { name: 'alice' }, { excludeExtraneousValues: true });

    expect(result).toBeInstanceOf(SampleDto);
    expect(result.name).toBe('alice');
  });
});
