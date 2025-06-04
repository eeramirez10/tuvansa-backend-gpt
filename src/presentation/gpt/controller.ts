import { Request, Response } from "express";
import { ProcessPromptForSqlDto } from '../../domain/dtos/process-prompt-for-sql.dto';
import { LanguageModelService } from '../../domain/services/language-model-service';
import { ProcessPromptForSqlUseCase } from "../../application/use-cases/process-prompt-for-sql.use-case";
import { purchaseSchema } from "../../data/purchase-schema";
import { SqlDataSource } from '../../domain/datasource/sql.datasource';
import { QueryStoreService } from '../../domain/services/query-store-service';
import { PaginationDto } from "../../domain/dtos/pagination.dto";
import { sanitizeSQL } from "../../infraestructure/helpers/sanitizeSql";

/**
 * @swagger
 * tags:
 *   name: GPT
 *   description: Operaciones relacionadas con GPT y SQL
 */


export class GptController {

  constructor(

    private readonly languageModelService: LanguageModelService,
    private readonly sqlDataSource: SqlDataSource,
    private readonly queryStoreService: QueryStoreService
  ) { }



  purchaseAnalisys = async (req: Request, res: Response) => {


    try {

      const [error, processPromptForSqlDto] = ProcessPromptForSqlDto.execute(req.body)

      const { sql } = await new ProcessPromptForSqlUseCase(this.languageModelService)
        .execute(processPromptForSqlDto, purchaseSchema)

      const baseSql = sanitizeSQL(sql)

      const queryId = await this.queryStoreService.create(baseSql)



      // const [total] = await new ExecuteSqlUseCase(this.sqlDataSource).execute({ sql: countSql })
      const { items, page, pageSize } = await this.sqlDataSource
        .executeSql({ sql: baseSql })


      res.json({
        queryId,
        items,
        page,
        pageSize,
        // total,
        // totalPages: paginationResult.totalPages

      })

      if (error) {
        res.status(400).json({ error })
        return
      }



    } catch (error) {
      console.error('Error en GptController:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }





  }


  getStoredQuery = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const queryId = req.query.queryId;

    const [error, paginationDto] = PaginationDto.execute({ page, pageSize, queryId })

    if (error) {
      res.status(400).json({ error })
      return
    }

    try {

      const savedSql = await this.queryStoreService.get(paginationDto.queryId)

      if (!savedSql) {

        res.status(400).json({
          error: 'query not found'
        })
        return
      }

      const { items, page, pageSize } = await this.sqlDataSource
        .executeSql({
          sql: savedSql,
          page: paginationDto.page,
          pageSize: paginationDto.pageSize
        })



      res.json({
        queryId,
        items,
        page,
        pageSize,
        // total,
        // totalPages: paginationResult.totalPages

      })
    } catch (error) {
      console.error('Error al recuperar SQL paginado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }






  }







}