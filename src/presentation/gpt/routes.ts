import { Router } from "express";
import { GptDataSource } from "../../domain/datasource/gpt.datasource";
import { GptDataSourceImpl } from '../../infraestructure/datasource/gpt.datasource.impl';
import OpenAI from "openai";
import { GptController } from "./controller";
import { GptRepositoryImpl } from "../../infraestructure/repositories/gpt.repository.impl";
import { envs } from "../../config/envs";
import { ProcessPromptForSqlUseCase } from "../../application/use-cases/process-prompt-for-sql.use-case";
import { ExecuteSqlUseCase } from '../../application/use-cases/execute-sql.use-case';
import { ProscaiDatasourceImpl } from "../../infraestructure/datasource/proscai.datasource.impl";
import { SqlRepository } from "../../domain/repositories/sql.repository";
import { ProscaiRepositoryImpl } from "../../infraestructure/repositories/proscai.repository.impl";
import { GenerateSummaryUseCase } from '../../application/use-cases/generate-summary.use-case';


export class GptRoutes {



  static routes = (): Router => {
    const router = Router()
    const openai = new OpenAI({ apiKey: envs.OPEN_API_KEY })
    const dataSource = new GptDataSourceImpl(openai)
    const sqlDataSource = new ProscaiDatasourceImpl({
      host: envs.URL_MYSQL,
      user: envs.USER_MYSQL,
      password: envs.PASSWORD_MYSQL,
      database: envs.DB_MYSQL
    })
    const sqlRepository = new ProscaiRepositoryImpl(sqlDataSource)
    const repository = new GptRepositoryImpl(dataSource)
    const processPromptForSqlUseCase = new ProcessPromptForSqlUseCase(repository)
    const executeSqlUseCase = new  ExecuteSqlUseCase(sqlRepository)
    const generateSummaryUseCase = new GenerateSummaryUseCase(repository)


    const { userPromptToSql } = new GptController(processPromptForSqlUseCase, executeSqlUseCase, generateSummaryUseCase )
    // @ts-ignore
    router.post('/user-prompt-to-sql', userPromptToSql)

    return router
  }
}