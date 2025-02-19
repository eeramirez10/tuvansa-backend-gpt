import { Router } from "express";
import { GptController } from "./controller";
import { envs } from "../../config/envs";
import { ProcessPromptForSqlUseCase } from "../../application/use-cases/process-prompt-for-sql.use-case";
import { ExecuteSqlUseCase } from '../../application/use-cases/execute-sql.use-case';
import { ProscaiDatasourceImpl } from "../../infraestructure/datasource/proscai.datasource.impl";

import { ProscaiRepositoryImpl } from "../../infraestructure/repositories/proscai.repository.impl";
import { GenerateSummaryUseCase } from '../../application/use-cases/generate-summary.use-case';
import { OpenAiServiceImpl } from "../../infraestructure/services/open-ai.service.impl";
import { ProcessUserPromptUseCase } from '../../application/use-cases/process-user-prompt.use-case';
import { upload } from "../../config/multer-config";
import { ProcessFileAndExtractQuotationUseCase } from '../../application/use-cases/process-file-and-extract-quotation.use-case';
import { ProcessFileUseCase } from "../../application/use-cases/process-file.use-case";


export class GptRoutes {



  static routes = (): Router => {
    const router = Router()

    const sqlDataSource = new ProscaiDatasourceImpl({
      host: envs.URL_MYSQL,
      user: envs.USER_MYSQL,
      password: envs.PASSWORD_MYSQL,
      database: envs.DB_MYSQL
    })

    const sqlRepository = new ProscaiRepositoryImpl(sqlDataSource)
    const openAiService = new OpenAiServiceImpl()
    const processPromptForSqlUseCase = new ProcessPromptForSqlUseCase(openAiService)
    const executeSqlUseCase = new ExecuteSqlUseCase(sqlRepository)
    const generateSummaryUseCase = new GenerateSummaryUseCase(openAiService)
    const processFileUseCase = new ProcessFileUseCase()

    const processUserPromptUseCase = new ProcessUserPromptUseCase(processPromptForSqlUseCase, executeSqlUseCase, generateSummaryUseCase)
    const processFileAndExtractQuotationUseCase = new ProcessFileAndExtractQuotationUseCase(processFileUseCase, openAiService)
    const { userPromptToSql, processQuotation } = new GptController(processUserPromptUseCase, processFileAndExtractQuotationUseCase)
    // @ts-ignore
    router.post('/user-prompt-to-sql', userPromptToSql)

    router.post('/process-quotation', upload.single('quotation'), processQuotation)

    return router
  }
}