import { Expose, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  @IsEnum(['string', 'boolean', 'number', 'date'])
  @IsOptional()
  type: 'string' | 'boolean' | 'number' | 'date';

  @Expose()
  @IsEnum(['true', 'false'])
  @ValidateIf((obj) => obj?.insensitive)
  @IsOptional()
  insensitive: 'true' | 'false';

  @Expose()
  @IsEnum(['contains', 'endsWith', 'startsWith', 'equals', 'gt', 'gte', 'in', 'lt', 'lte', 'not', 'notIn', 'hasEvery', 'hasSome', 'has', 'isEmpty'])
  @IsOptional()
  operator: typeOperator;

  @Expose()
  @IsEnum(['and', 'not', 'or'])
  @IsOptional()
  filterGroup: 'and' | 'not' | 'or';

  @Expose()
  @Type(() => FilterFields)
  filter: FilterFields[];

  @Expose()
  @IsEnum(['none', 'some', 'every'])
  @IsOptional()
  filterInsideOperator: 'none' | 'some' | 'every';
}

type typeOperator =
  | 'contains'
  | 'endsWith'
  | 'startsWith'
  | 'equals'
  | 'gt'
  | 'gte'
  | 'in'
  | 'lt'
  | 'lte'
  | 'not'
  | 'notIn'
  | 'hasEvery'
  | 'hasSome'
  | 'has'
  | 'isEmpty';
