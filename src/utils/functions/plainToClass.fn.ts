import { ClassTransformOptions } from '@nestjs/common/interfaces/external/class-transform-options.interface';
import { ClassConstructor, plainToClass } from 'class-transformer';

export function defaultPlainToClass<T, V>(cls: ClassConstructor<T>, plain: V, options?: ClassTransformOptions): T {
  return plainToClass(cls, plain, {
    ...options,
    excludeExtraneousValues: true,
    exposeUnsetFields: false,
    enableImplicitConversion: true
  });
}
