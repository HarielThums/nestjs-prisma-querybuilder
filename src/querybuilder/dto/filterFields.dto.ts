import { Expose, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { FILTER_OPERATORS, FilterOperator } from '../constants/filter.constants';

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
