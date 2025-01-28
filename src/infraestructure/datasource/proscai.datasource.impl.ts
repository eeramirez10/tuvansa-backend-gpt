import { SqlDataSource } from "../../domain/datasource/sql.datasource";
import { ExecuteSqlDto } from "../../domain/dtos/execute-sql.dto";
import mysql from 'mysql2/promise'

export class ProscaiDatasourceImpl implements SqlDataSource {

  private readonly pool: mysql.Pool

  constructor(config: mysql.PoolOptions){
    this.pool = mysql.createPool(config)
  }

  async executeSql(executeSqlDto: ExecuteSqlDto): Promise<any> {
    const { sql } = executeSqlDto

    try {

      const [rows] = await this.pool.query(sql)

      return rows
    } catch (error) {
      console.log(error)
      throw new Error('Error al ejecutar la consulta SQL')
    }

  }

}