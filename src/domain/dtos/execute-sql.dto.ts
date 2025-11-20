

export interface ExecuteSqlDtoOptions {
  sql: string;
  page?: number;
  pageSize?: number;
}



export class ExecuteSqlDto {
  public readonly sql: string
  public readonly page?: number
  public readonly pageSize?:number

  constructor(options: ExecuteSqlDtoOptions){
    const {sql, page, pageSize} = options
    this.sql = sql
    this.page = page
    this.pageSize = pageSize

  }


  
}