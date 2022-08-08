import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  populate: PopulateFields[];
}
