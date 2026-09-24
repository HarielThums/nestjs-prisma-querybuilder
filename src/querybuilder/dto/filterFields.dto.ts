import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { FILTER_OPERATORS, FilterOperator, SCALAR_LIST_OPERATORS } from '../constants/filter.constants';

/**
 * `not=true` needs a value to negate and cannot be combined with scalar-list operators,
 * since Prisma list filters have no `not` key.
 */
@ValidatorConstraint({ name: 'notFlag' })
class NotFlagConstraint implements ValidatorConstraintInterface {
  validate(not: unknown, args: ValidationArguments): boolean {
    const { operator, value } = args.object as FilterFields;

    if (not !== 'true') return true;
    if (operator && SCALAR_LIST_OPERATORS.includes(operator)) return false;

    return value !== undefined;
  }

  defaultMessage(args: ValidationArguments): string {
    const { operator } = args.object as FilterFields;

    if (operator && SCALAR_LIST_OPERATORS.includes(operator)) {
      return `not cannot be combined with operator ${operator} (Prisma list filters do not support not)`;
    }

    return 'not requires a value';
  }
}

export class FilterFields {
  @Expose()
  @IsString()
  @IsNotEmpty()
  path: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((obj) => !obj?.filter || obj?.value)
  value: any;

  @Expose()
  @IsEnum(['string', 'boolean', 'number', 'date', 'object'])
  @IsOptional()
  type: 'string' | 'boolean' | 'number' | 'date' | 'object';

  @Expose()
  @IsEnum(['true', 'false'])
  @ValidateIf((obj) => obj?.insensitive)
  @IsOptional()
  insensitive: 'true' | 'false';

  @Expose()
  @IsEnum(FILTER_OPERATORS)
  @IsOptional()
  operator: FilterOperator;

  /**
   * Negates the field condition by wrapping it in Prisma's `not: { ... }`
   * (e.g. `operator=contains&not=true` → `{ not: { contains: value } }`).
   * Differs from `filterGroup=not`, which pushes the condition into the top-level `NOT` array.
   */
  @Expose()
  @IsEnum(['true', 'false'])
  @Validate(NotFlagConstraint)
  @ValidateIf((obj) => obj?.not)
  @IsOptional()
  not: 'true' | 'false';

  @Expose()
  @IsEnum(['and', 'not', 'or'])
  @IsOptional()
  filterGroup: 'and' | 'not' | 'or';

  @Expose()
  @Type(() => FilterFields)
  @ValidateNested({ each: true })
  @IsOptional()
  filter: FilterFields[];

  @Expose()
  @IsEnum(['none', 'some', 'every'])
  @IsOptional()
  filterInsideOperator: 'none' | 'some' | 'every';
}
