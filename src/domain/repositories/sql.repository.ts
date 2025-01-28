import { ExecuteSqlDto } from "../dtos/execute-sql.dto";


export abstract class SqlRepository {

  abstract executeSql(executeSqlDto: ExecuteSqlDto): Promise<any>

}