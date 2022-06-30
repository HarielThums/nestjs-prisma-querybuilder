import { Expose } from 'class-transformer';

export class QueryResponse {
  @Expose()
  where: any;

  @Expose()
  orderBy: any;

  @Expose()
  skip: any;

  @Expose()
  take: any;

  @Expose()
  select?: any;

  @Expose()
  include?: any;
}
