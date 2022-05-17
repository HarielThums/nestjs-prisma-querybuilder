import { Expose, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { FilterFields } from './filterFields.dto';
import { PopulateFields } from './populateFields.dto';

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

  // don't work yet;
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Expose()
  include: string;

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
