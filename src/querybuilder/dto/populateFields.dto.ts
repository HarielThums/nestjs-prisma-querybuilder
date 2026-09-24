import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { FilterFields } from './filterFields.dto';

export class PopulateFields {
  @Expose()
  @IsString()
  @IsNotEmpty()
  path: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  primaryKey = 'id';

  @Expose()
  @IsString()
  @IsNotEmpty()
  select: string;

  @Expose()
  @Type(() => PopulateFields)
  @ValidateNested({ each: true })
  @IsOptional()
  populate: PopulateFields[];

  @Expose()
  @Type(() => FilterFields)
  @ValidateNested({ each: true })
  @IsOptional()
  filter: FilterFields[];
}
