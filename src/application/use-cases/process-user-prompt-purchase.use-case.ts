import { purchaseSchema } from "../../data/purchase-schema";
import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { ExecuteSqlUseCase } from "./execute-sql.use-case";
import { GenerateSummaryUseCase } from "./generate-summary.use-case";
import { ProcessPromptForSqlUseCase } from "./process-prompt-for-sql.use-case";


export class ProcessUserPromptPurchaseUseCase {

    constructor(
      private readonly processPromptForSqlUseCase: ProcessPromptForSqlUseCase,
      private readonly executeSqlUseCase: ExecuteSqlUseCase,
      private readonly generateSummaryUseCase: GenerateSummaryUseCase
    ) { }

      async execute(dto: ProcessPromptForSqlDto) {
    
        const gptEntity = await this.processPromptForSqlUseCase.execute(dto, purchaseSchema );
    
        const executeSqlDto = { sql: gptEntity.sql };
        const sqlResult = await this.executeSqlUseCase.execute(executeSqlDto);
    
    
        // const summaryEntity = await this.generateSummaryUseCase.execute({
        //   prompt: dto.prompt,
        //   sqlResult,
        // });
    
        return {
          sql: gptEntity.sql,
          summary: sqlResult,
        };
    
    
      }


}