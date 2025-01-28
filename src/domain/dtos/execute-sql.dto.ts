

export class ExecuteSqlDto {
  public readonly sql: string

  constructor(props:{ sql:string}){
    this.sql = props.sql
  }
}