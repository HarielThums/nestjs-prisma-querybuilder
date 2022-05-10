import { Expose } from 'class-transformer';

export class QueryResponse {
  @Expose()
  where: any;

  @Expose()
  select: any;

  @Expose()
  orderBy: any;

  @Expose()
  skip: any;

  @Expose()
  take: any;

  @Expose()
  include: any;
}
