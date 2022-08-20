import { Expose } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SortFields {
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  @Expose()
  criteria: 'asc' | 'desc' = 'asc';

  @IsString()
  @IsNotEmpty()
  @Expose()
  field: string;
}
