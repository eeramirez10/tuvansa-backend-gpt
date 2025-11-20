export interface Option<T> {
  items: T[];
  total?: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export class PaginationResult<T> {

  public readonly items: T[]
  public readonly total?: number
  public readonly page: number
  public readonly pageSize: number
  public readonly totalPages?: number;

  constructor(options: Option<T>) {
    this.items = options.items
    this.total = options.total
    this.page = options.page
    this.pageSize = options.pageSize
    this.totalPages = options.totalPages
  }


}