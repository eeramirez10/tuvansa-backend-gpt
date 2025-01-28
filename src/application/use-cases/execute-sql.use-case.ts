import { ExecuteSqlDto } from "../../domain/dtos/execute-sql.dto";
import { SqlRepository } from "../../domain/repositories/sql.repository";

export class ExecuteSqlUseCase {

  constructor(private readonly sqlRepository:SqlRepository){}

  async execute(executeSqlDto: ExecuteSqlDto){
    return this.sqlRepository.executeSql(executeSqlDto)
  }
}