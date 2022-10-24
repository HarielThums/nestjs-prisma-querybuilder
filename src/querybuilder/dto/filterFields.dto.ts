import { Expose } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class FilterFields {
  @Expose()
  @IsString()
  @IsNotEmpty()
  path: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  value: any;

  @Expose()
  @IsEnum(['string', 'boolean', 'number', 'date'])
  @IsOptional()
  type: 'string' | 'boolean' | 'number' | 'date';

  @Expose()
  @IsEnum(['true', 'false'])
  @ValidateIf((obj) => obj.insensitive)
  @IsOptional()
  insensitive: 'true' | 'false';

  @Expose()
  @IsEnum(['contains', 'endsWith', 'startsWith', 'equals', 'gt', 'gte', 'in', 'lt', 'lte', 'not', 'notIn'])
  @IsOptional()
  operator: 'contains' | 'endsWith' | 'startsWith' | 'equals' | 'gt' | 'gte' | 'in' | 'lt' | 'lte' | 'not' | 'notIn';

  @Expose()
  @IsEnum(['and', 'not', 'or'])
  @IsOptional()
  filterGroup: 'and' | 'not' | 'or';
}
