import { envs } from "../../config/envs";
import { SqlDataSource } from "../../domain/datasource/sql.datasource";
import { ExecuteSqlDto } from "../../domain/dtos/execute-sql.dto";
import mysql from 'mysql2/promise'
import { PaginationResult } from "../../domain/entities/pagination-result";

export class ProscaiDatasourceImpl implements SqlDataSource {

  private readonly pool = mysql.createPool({
    host: envs.URL_MYSQL,
    user: envs.USER_MYSQL,
    password: envs.PASSWORD_MYSQL,
    database: envs.DB_MYSQL
  })

  constructor() {
  }

  async executeSql(executeSqlDto: ExecuteSqlDto): Promise<PaginationResult<any>> {
    const { sql, page = 1, pageSize = 10 } = executeSqlDto

    const offset = (page - 1) * pageSize;
    const paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${offset}`;

    try {

      const [rows] = await this.pool.query(paginatedSql) as any[]


      return {
        items: rows,
        page,
        pageSize
      }
    } catch (error) {
      console.log(error)
      throw new Error('Error al ejecutar la consulta SQL')
    }

  }

}