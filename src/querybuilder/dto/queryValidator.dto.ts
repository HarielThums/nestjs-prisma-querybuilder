import { Expose, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class QueryValidator {
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  @Expose()
  sort: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((obj) => obj.sort)
  @Expose()
  sortField: string;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Expose()
  page: number;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Expose()
  limit: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Expose()
  select: string;

  @Expose()
  @Type(() => PopulateFields)
  @ValidateNested({ each: true })
  populate: PopulateFields[];

  @Expose()
  @IsEnum(['and', 'not', 'or'])
  @IsOptional()
  operator: string;

  @Expose()
  @Type(() => FilterFields)
  @ValidateNested({ each: true })
  filter: FilterFields[];
}

export class PopulateFields {
  @Expose()
  @IsString()
  @IsNotEmpty()
  path: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  select: string;

  @Expose()
  @Type(() => PopulateFields)
  populate: PopulateFields[];
}

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
