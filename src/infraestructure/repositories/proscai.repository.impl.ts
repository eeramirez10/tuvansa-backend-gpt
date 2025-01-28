import { SqlDataSource } from "../../domain/datasource/sql.datasource";
import { ExecuteSqlDto } from "../../domain/dtos/execute-sql.dto";
import { SqlRepository } from "../../domain/repositories/sql.repository";

export class ProscaiRepositoryImpl implements SqlRepository {

  constructor(public datasource: SqlDataSource){}
  executeSql(executeSqlDto: ExecuteSqlDto): Promise<any> {
    return this.datasource.executeSql(executeSqlDto)
  }


}