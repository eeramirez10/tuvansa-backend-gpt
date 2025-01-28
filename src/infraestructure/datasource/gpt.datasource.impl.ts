// GptDataSourceImpl.ts

import OpenAI from "openai";
import { GptDataSource } from "../../domain/datasource/gpt.datasource";
import { GptEntity } from "../../domain/entities/gpt.entity";
import { schema } from "../../data/schema";
import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { GenerateSummaryDto } from "../../domain/dtos/generate-summary.dto";
import { SummaryEntity } from "../../domain/entities/summary.entity";



interface processPromptForSQLResponse {
  query: string,
  error: string
  originalPrompt: string 
}

export class GptDataSourceImpl implements GptDataSource {
  constructor(private readonly openai: OpenAI) { }
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
      model: 'gpt-4',
      max_tokens: 2000,
      temperature: 0.3,
    });

    let response = completion.choices[0].message.content as string;

    // Limpiar la respuesta para eliminar posibles delimitadores de código
    response = this.cleanSummaryResponse(response);


    return new SummaryEntity({ message: response });
  }

  // Función auxiliar para limpiar la respuesta en caso de que el modelo incluya delimitadores
  private cleanSummaryResponse(response: string): string {
    // Eliminar los delimitadores de bloques de código ```sql y ```
    response = response.replace(/```sql\s*/i, '').replace(/```\s*$/i, '').trim();
    return response;
  }

  async processPromptForSQL(processPromptForSql: ProcessPromptForSqlDto): Promise<GptEntity> {
    const { prompt } = processPromptForSql;

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
                  Dado los siguientes esquemas escritos en sql que te voy a pasar como ejemplo, 
          quiero que hagas la consulta en base a lo que te pida el usuario y quiero que me des 
          de la siguiete manera: 

          no me lo pongas de esta manera:

          


          {
            "query": "El query que vas a generar",
            "error": null,
            "originalPrompt": "Lo que te escribio el usuario"
          }

          schemas: 

          ${schema}
          

          si hay un error retornalo de esta forma

          ejemplo

          {
            "query": null,
            error:" el error"
            "originalPrompt": "Lo que te escribio el usuario"
          }
          `,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-4', // Asegúrate de que el nombre del modelo es correcto
      max_tokens: 1000,
      temperature: 0.1,
    });

    let response = completion.choices[0].message.content 

    // Opcional: Limpiar cualquier delimitador de código que pueda haberse incluido
    response = this.cleanSqlResponse(response)

    const responsetoJson = JSON.parse(response)
    return new GptEntity({ prompt, sql: responsetoJson['query'] });
  }



  // Función auxiliar para limpiar la respuesta en caso de que el modelo incluya delimitadores
  private cleanSqlResponse(response: string): string {
    // Eliminar los delimitadores de bloques de código ```sql y ```
    response = response.replace(/```sql\s*/i, '').replace(/```\s*$/i, '').trim();
    return response;
  }

  public getClient() {
    return this.openai
  }
}
