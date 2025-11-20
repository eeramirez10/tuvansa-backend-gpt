
interface Option {
  page: number
  pageSize: number
  queryId: string

}



export class PaginationDto {

  public readonly page: number
  public readonly pageSize: number
  public readonly queryId: string


  constructor(options: Option) {
    this.page = options.page
    this.pageSize = options.pageSize
    this.queryId = options.queryId
  }

  static execute(values: { [key: string]: any; }): [string?, PaginationDto?] {


    const {
      page = 1,
      pageSize = 30,
      queryId
    } = values


    if (page < 0) return ['the page cannot be less than zero ']
    if (pageSize < 0) return ['Page size cannot be less than zero']
    if(!queryId) return ['missing queryId']

    return [, new PaginationDto({ page: Number(page), pageSize: Number(pageSize), queryId })]

  }
}