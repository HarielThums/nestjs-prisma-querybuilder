import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { FilterFields } from './filterFields.dto';
import { PopulateFields } from './populateFields.dto';
import { SortFields } from './sortFields.dto';

export class QueryValidator {
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
  @Type(() => FilterFields)
  @ValidateNested({ each: true })
  filter: FilterFields[];

  @Expose()
  @Type(() => SortFields)
  @ValidateNested({ each: true })
  sort: SortFields;
}
