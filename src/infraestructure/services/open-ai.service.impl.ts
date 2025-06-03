import OpenAI from "openai";
import { GenerateSummaryDto } from "../../domain/dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../../domain/entities/gpt.entity";
import { QuotationEntity } from "../../domain/entities/quotation.entity";
import { SummaryEntity } from "../../domain/entities/summary.entity";
import { LanguageModelService } from "../../domain/services/language-model-service";
import { openAiConfig } from "../../config/open-ai-config";
import { schema } from "../../data/schema";


export class OpenAiServiceImpl implements LanguageModelService {

  private readonly openai = new OpenAI(openAiConfig)

  constructor() {

  }


  async extractQuotationData(textContent: string): Promise<QuotationEntity> {
    const response = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que organiza solicitudes de cotización de materiales en un formato uniforme.',
        },
        // {
        //   role: 'user',
        //   content: `Extrae y organiza la información clave de esta cotización:\n${textContent}`,
        // },
        // {
        //   role: 'system',
        //   content: `Eres un asistente que organiza solicitudes de cotización de materiales en un formato uniforme.`,
        // },
        {
          role: 'user',
          content: `
          Extrae y organiza la información clave de esta cotización solo dame la informacion de los productos, quiero que me lo regreses asi:
          {
            description: la descripcion del producto o la informacion del producto concatenando otras columnas si viene info de relacionada a la descripcion,
            cantidad: la cantidad de piezas o metros del producto que pide el cliente,
            unidad: la unidad de medida del producto (pza, m, cm, pieza, metro, tramo, etc...),

          }
           y regresamela en json el puro json sin explicaciones ni nada con los valores de cada uno:\n${textContent}
        
          `,
          //   content: `
          //   Analiza la informacion de la cotizacion:\n${textContent}

          //   ahora de la informacion que analizaste busca los productos en esta otra lista ${products} y solo dame los que encontraste
          //   `,
        },
      ],
      temperature: 0.2,
      max_tokens: 10000,
    });

    console.log(response.choices[0].message.content);

    let extractedInfo = response.choices[0].message.content;

    if (
      extractedInfo.startsWith('```json\n') &&
      extractedInfo.endsWith('\n```')
    ) {
      extractedInfo = extractedInfo
        .replace(/```json\n/, '') // Elimina el inicio ```json
        .replace(/\n```$/, ''); // Elimina el final ```
    }

    return JSON.parse(extractedInfo);
  }
  async generateSummary(generateSummaryDto: GenerateSummaryDto): Promise<SummaryEntity> {
    const { prompt, sqlResult } = generateSummaryDto
    const formattedResult = JSON.stringify(sqlResult, null, 2);

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
            Eres un asistente experto en análisis de datos. A continuación, te proporcionaré los resultados de una consulta SQL y la solicitud original del usuario.
            Tu tarea es interpretar los resultados y generar una respuesta clara y concisa en español que responda a la solicitud del usuario.
            No incluyas bloques de código ni formatos adicionales.
          `,
        },
        {
          role: 'user',
          content: `
            Solicitud del usuario: ${prompt}
            Resultados de la consulta SQL: ${formattedResult}

            Por favor, proporciona una respuesta clara y concisa basada en los resultados.
          `,
        },
      ],
      model: 'chatgpt-4o-latest',
      max_tokens: 10000,
      temperature: 0.3,
    });

    let response = completion.choices[0].message.content as string;

    // Limpiar la respuesta para eliminar posibles delimitadores de código
    // response = this.cleanSummaryResponse(response);


    return new SummaryEntity({ message: response });
  }

  // Función auxiliar para limpiar la respuesta en caso de que el modelo incluya delimitadores
  private cleanSummaryResponse(response: string): string {
    // Eliminar los delimitadores de bloques de código ```sql y ```
    response = response.replace(/```sql\s*/i, '').replace(/```\s*$/i, '').trim();
    return response;
  }

  async processPromptForSQL(processPromptForSql: ProcessPromptForSqlDto, dbSchema: string): Promise<GptEntity> {
    const { prompt } = processPromptForSql;

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
                  Dado los siguientes esquemas escritos en sql que te voy a pasar como ejemplo, 
          quiero que hagas la consulta en base a lo que te pida el usuario y quiero que me des 
          solo el sql como string sin las comillas ni la palabra sql  y no me des explicaciones
  
          schemas: 

          ${dbSchema}
          

          `,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-4.1',
      max_tokens: 10000,
      temperature: 0.1,
    });

    let response = completion.choices[0].message.content

    // console.log({ response })

    // Opcional: Limpiar cualquier delimitador de código que pueda haberse incluido
    // response = this.cleanSqlResponse(response)



    // const responsetoJson = JSON.parse(response)

    return new GptEntity({ prompt, sql: response });
  }



  // Función auxiliar para limpiar la respuesta en caso de que el modelo incluya delimitadores
  private cleanSqlResponse(response: string): string {
    // Eliminar los delimitadores de bloques de código ```sql y ```
    response = response.replace(/```sql\s*/i, '').replace(/```\s*$/i, '').replace(/```json|```/g, '').trim();
    return response;
  }



}