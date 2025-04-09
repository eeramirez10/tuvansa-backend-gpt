import { Request, Response } from "express";
import { ProcessPromptForSqlDto } from '../../domain/dtos/process-prompt-for-sql.dto';

import { ProcessUserPromptUseCase } from "../../application/use-cases/process-user-prompt.use-case";
import { error } from "console";
import { ProcessFileUseCase } from '../../application/use-cases/process-file.use-case';
import { ProcessFileAndExtractQuotationUseCase } from "../../application/use-cases/process-file-and-extract-quotation.use-case";
import { ProcessUserPromptPurchaseUseCase } from '../../application/use-cases/process-user-prompt-purchase.use-case';


/**
 * @swagger
 * tags:
 *   name: GPT
 *   description: Operaciones relacionadas con GPT y SQL
 */


export class GptController {

  constructor(

    private readonly processUserPromptUseCase: ProcessUserPromptUseCase,
    private readonly processFileAndExtractQuotationUseCase: ProcessFileAndExtractQuotationUseCase,
    private readonly processUserPromptPurchaseUseCase: ProcessUserPromptPurchaseUseCase

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

      const { sql, summary } = await this.processUserPromptUseCase.execute(processPromptForSqlDto)


      res.json({
        sql,
        summary
      });

    } catch (error) {
      console.error('Error en GptController:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }





  }

  purchaseAnalisys = async (req: Request, res: Response) => {

    try {

      const [error, processPromptForSqlDto] = ProcessPromptForSqlDto.execute(req.body)

      if (error) {
        res.status(400).json({ error })
        return
      }

      const { sql, summary } = await this.processUserPromptPurchaseUseCase.execute(processPromptForSqlDto)


      res.json({
        sql,
        summary
      });

    } catch (error) {
      console.error('Error en GptController:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }





  }




  public processQuotation = async (req: Request, res: Response) => {

    try {

      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'File is required' })
        return
      }


      const quotation = await this.processFileAndExtractQuotationUseCase.execute(file)

      res.json({
        success: true,
        quotation
      })


    } catch (error) {
      console.error('[FileController]', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }

  }





}