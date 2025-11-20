import { ExecuteSqlDto } from "../dtos/execute-sql.dto";
import { PaginationResult } from "../entities/pagination-result";


export abstract class SqlDataSource {

  abstract executeSql(executeSqlDto: ExecuteSqlDto): Promise< PaginationResult<any>>

}