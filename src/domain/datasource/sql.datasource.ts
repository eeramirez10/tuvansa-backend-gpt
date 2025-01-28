import { ExecuteSqlDto } from "../dtos/execute-sql.dto";


export abstract class SqlDataSource {

  abstract executeSql(executeSqlDto: ExecuteSqlDto): Promise<any>

}