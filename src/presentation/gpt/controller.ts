import { Request, Response } from "express";
import { GptRepository } from "../../domain/repositories/gpt.repository";
import { ProcessPromptForSqlDto } from '../../domain/dtos/process-prompt-for-sql.dto';
import { ExecuteSqlUseCase } from '../../application/use-cases/execute-sql.use-case';
import { GenerateSummaryUseCase } from "../../application/use-cases/generate-summary.use-case";
import { ProcessPromptForSqlUseCase } from '../../application/use-cases/process-prompt-for-sql.use-case';


/**
 * @swagger
 * tags:
 *   name: GPT
 *   description: Operaciones relacionadas con GPT y SQL
 */


export class GptController {

  constructor(
    private readonly processPromptForSqlUseCase: ProcessPromptForSqlUseCase,
    private readonly executeSqlUseCase: ExecuteSqlUseCase,
    private readonly generateSummaryUseCase: GenerateSummaryUseCase,



  ) { }

    /**
   * @swagger
  /**
   * @swagger
   * /gpt/user-prompt-to-sql:
   *   post:
   *     summary: Genera y ejecuta una consulta SQL basada en un prompt del usuario, y devuelve un resumen.
   *     tags: [GPT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserPrompt'
   *     responses:
   *       200:
   *         description: Respuesta exitosa con la consulta SQL generada, el resumen y el total de ventas.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       400:
   *         description: Solicitud inválida.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Error interno del servidor.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */

  public userPromptToSql = async (req: Request, res: Response) => {

    try {

      const [error, processPromptForSqlDto] = ProcessPromptForSqlDto.execute(req.body)

      if (error) return res.status(400).json({ error })

      const gptEntity = await this.processPromptForSqlUseCase.execute(processPromptForSqlDto)

  

      const executeSqlDto = { sql: gptEntity.sql };

      const sqlResult = await this.executeSqlUseCase.execute(executeSqlDto)

      const summaryEntity = await this.generateSummaryUseCase.execute({ prompt: processPromptForSqlDto.prompt, sqlResult })


      res.json({
        sql: gptEntity.sql,
        summary: summaryEntity.message,
      });

    } catch (error) {
      console.error('Error en GptController:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }





  }
}