import { Expose } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  type: string;

  @Expose()
  @IsEnum(['contains', 'endsWith', 'startsWith', 'equals', 'gt', 'gte', 'in', 'lt', 'lte', 'not', 'notIn'])
  @IsOptional()
  operator: string;
}
