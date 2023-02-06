import { Expose, Transform, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class FilterFields {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @Transform((value) => value.obj?.path || value.obj['[path]'])
  path: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((obj) => !obj?.filter || obj?.value)
  @Transform((value) => value.obj?.value || value.obj['[value]'])
  value: any;

  @Expose()
  @IsEnum(['string', 'boolean', 'number', 'date'])
  @IsOptional()
  @Transform((value) => value.obj?.type || value.obj['[type]'])
  type: 'string' | 'boolean' | 'number' | 'date';

  @Expose()
  @IsEnum(['true', 'false'])
  @ValidateIf((obj) => obj?.insensitive)
  @IsOptional()
  @Transform((value) => value.obj?.insensitive || value.obj['[insensitive]'])
  insensitive: 'true' | 'false';

  @Expose()
  @IsEnum(['contains', 'endsWith', 'startsWith', 'equals', 'gt', 'gte', 'in', 'lt', 'lte', 'not', 'notIn', 'hasEvery', 'hasSome', 'has', 'isEmpty'])
  @IsOptional()
  @Transform((value) => value.obj?.operator || value.obj['[operator]'])
  operator: typeOperator;

  @Expose()
  @IsEnum(['and', 'not', 'or'])
  @IsOptional()
  @Transform((value) => value.obj?.filterGroup || value.obj['[filterGroup]'])
  filterGroup: 'and' | 'not' | 'or';

  @Expose()
  @Type(() => FilterFields)
  @ValidateNested({ each: true })
  @Transform((value) => value.obj?.filter || value.obj['[filter]'])
  filter: FilterFields[];

  @Expose()
  @IsEnum(['none', 'some', 'every'])
  @IsOptional()
  @Transform((value) => value.obj?.filterInsideOperator || value.obj['[filterInsideOperator]'])
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
