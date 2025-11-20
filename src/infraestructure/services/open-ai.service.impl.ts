import OpenAI from "openai";
import { GenerateSummaryDto } from "../../domain/dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../../domain/dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../../domain/entities/gpt.entity";
import { QuotationEntity } from "../../domain/entities/quotation.entity";
import { SummaryEntity } from "../../domain/entities/summary.entity";
import { BridaProperties, LanguageModelService, PRODUCT_OPTIONS, ProductoTipo, TuboPlasticoProperties, ValvulaProperties } from "../../domain/services/language-model-service";
import { openAiConfig } from "../../config/open-ai-config";
import { schema } from "../../data/schema";




export class OpenAiServiceImpl implements LanguageModelService {

  private readonly openai = new OpenAI(openAiConfig)

  constructor() {

  }




  embed(text: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  // async extractQuotationData(textContent: string): Promise<QuotationEntity[]> {

  //   console.log(textContent)
  //   const response = await this.openai.chat.completions.create({
  //     model: 'gpt-5-nano',
  //     messages: [
  //       {
  //         role: 'system',
  //         content:
  //           'Eres un asistente que organiza solicitudes de cotización de materiales en un formato uniforme.',
  //       },
  //       {
  //         role: 'user',
  //         content: `
  //         Extrae y organiza la información clave de esta cotización solo dame la informacion de los productos, quiero que me lo regreses asi:
  //         {
  //           description: la descripcion del producto o la informacion del producto concatenando otras columnas si viene info de relacionada a la descripcion,
  //           cantidad: la cantidad de piezas o metros del producto que pide el cliente,
  //           unidad: la unidad de medida del producto (pza, m, cm, pieza, metro, tramo, etc...),

  //         }
  //          y regresamela en json el puro json sin explicaciones ni nada con los valores de cada uno:\n${textContent}

  //         `,
  //       },
  //     ],

  //   });


  //   let extractedInfo = response.choices[0].message.content;

  //   console.log({ extractedInfo })

  //   if (
  //     extractedInfo.startsWith('```json\n') &&
  //     extractedInfo.endsWith('\n```')
  //   ) {
  //     extractedInfo = extractedInfo
  //       .replace(/```json\n/, '') // Elimina el inicio ```json
  //       .replace(/\n```$/, ''); // Elimina el final ```
  //   }

  //   return JSON.parse(extractedInfo);
  // }

  // Asumo que ya tienes definido QuotationEntity:
  // type QuotationEntity = { description: string; cantidad: number; unidad: string | null };

  private readonly EXTRACTION_SYSTEM_PROMPT = `
Eres un extractor de datos estricto. Debes responder SIEMPRE con SOLO un JSON válido (sin texto extra, sin markdown, sin comentarios, sin preguntas).
Formato EXACTO de salida: un arreglo JSON de objetos con claves en minúsculas:
[
  { "description": string, "cantidad": number, "unidad": string|null },
  ...
]

Reglas:
- NO hagas preguntas ni pidas confirmaciones.
- NO expliques nada. NO uses \`\`\` ni “json:”.
- Si un dato falta:
  - cantidad: usa 1 (número).
  - unidad: usa null si no se puede inferir.
- description: texto del producto; puedes concatenar info relacionada si aporta al entendimiento (evita notas administrativas).
- Normaliza unidades:
  - "pz","pza","pieza","piezas" -> "pza"
  - "m","ml","metro","metros","mto" -> "m"
  - "cm","centimetro","centímetros" -> "cm"
  - "mm" -> "mm"
  - "tramo","tramos" -> "tramo"
  - Si no se reconoce, usa null (no inventes).
- cantidad debe ser número (no string). Si viene como rango o texto, infiere el número más probable; si no es claro, usa 1.
- Si no encuentras productos, devuelve [].
`.trim();

  private buildResponseFormat() {
    // Si tu SDK no soporta response_format, quita esta función y la propiedad "response_format" en la llamada.
    return {
      type: "json_schema" as const,
      json_schema: {
        name: "quotation_items",
        schema: {
          type: "array",
          items: {
            type: "object",
            required: ["description", "cantidad", "unidad"],
            additionalProperties: false,
            properties: {
              description: { type: "string" },
              cantidad: { type: "number" },
              unidad: { anyOf: [{ type: "string" }, { type: "null" }] }
            }
          }
        },
        strict: true
      }
    };
  }

  private parseArrayJsonSafe(raw: string): QuotationEntity[] {
    let txt = (raw ?? "").trim();

    // 1) Intento directo
    try {
      const parsed = JSON.parse(txt);
      return Array.isArray(parsed) ? parsed : [];
    } catch { /* sigue */ }

    // 2) Remover fences si los hubiera
    txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      const parsed = JSON.parse(txt);
      return Array.isArray(parsed) ? parsed : [];
    } catch { /* sigue */ }

    // 3) Recortar desde el primer "[" hasta el último "]"
    const start = txt.indexOf("[");
    const end = txt.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = txt.slice(start, end + 1);
      try {
        const parsed = JSON.parse(slice);
        return Array.isArray(parsed) ? parsed : [];
      } catch { /* sigue */ }
    }

    // 4) Falla segura
    return [];
  }

  public async extractQuotationData(textContent: string): Promise<QuotationEntity[]> {

    console.log(textContent)
    const messages = [
      { role: "system" as const, content: this.EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `Extrae SOLO los productos en el formato indicado del siguiente contenido:\n\n${textContent}`
      }
    ];

    const response = await this.openai.chat.completions.create({
     model: "gpt-5-chat-latest",
      temperature: 0.3,
     
      messages
    });

    const content = response.choices?.[0]?.message?.content ?? "";
    const items = this.parseArrayJsonSafe(content);


    return items;
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
          Dado los siguientes esquemas escritos en SQL que te voy a pasar como ejemplo, 
          genera una consulta SQL basada en lo que el usuario pida.

          ⚠️ No incluyas las palabras LIMIT ni OFFSET en el SQL.

          Devuélveme solo el código SQL (sin comillas, sin bloques de código, sin explicaciones).

          schemas: 

          ${dbSchema}


          
          

          `,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
     model: "chatgpt-4o-latest",
      max_tokens: 10000,
      temperature: 0.3,
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


  async detectCosturaType(descripcion: string): Promise<"SIN COSTURA" | "CON COSTURA" | null> {

    const prompt = `
      Dada la siguiente descripción de un producto industrial, indica únicamente si el producto es SIN COSTURA o CON COSTURA.
      Considera todas las variantes y abreviaciones para ambos casos, por ejemplo:
      - Sin costura: "sin costura", "s/c", "sc", "t.s.c.", "tsc", "s.c.", etc.
      - Con costura: "con costura", "cc", "c/c", "tubo con costura", "t.c.c.", "tcc", "c.c.", "tubo tcc", etc.
      - null: si no encuentras las anteriores

      No expliques nada. Solo responde exactamente: "SIN COSTURA", "CON COSTURA" o "null" si no se puede determinar.

      Descripción: """${descripcion}"""
    `;

    const response = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0.3,
    });

    const result = (response.choices[0].message.content ?? "").toUpperCase().replace(/["\n\r]/g, "").trim();

    console.log({ result })

    if (result.includes("SIN COSTURA")) return "SIN COSTURA";
    if (result.includes("CON COSTURA")) return "CON COSTURA";
    return null;
  }

  async extractPipeProperties(descripcion: string) {
    const prompt = `
    Eres un asistente experto en productos industriales. Analiza la siguiente descripción y extrae:
      
    - tipoCostura: Si la descripción menciona SIN COSTURA, SC, S.C., S/C, S.C, indica "SIN COSTURA".  
      Si menciona CON COSTURA, CC, C.C., C/C, C.C, indica "CON COSTURA".  
      Si no encuentras ninguna variante, pon null.
    - diametro: Extrae el diámetro nominal en pulgadas, por ejemplo 2", 2 1/2", 3/4", 4", etc.  
      Si viene como 2-1/2", conviértelo a "2 1/2". Si no encuentras diámetro, pon null.
    - cedula: Extrae la cédula (puede aparecer como CED, SCH, STD, 10, 40, 80, XXS, etc). Si no se encuentra, pon null.
      
    Pon la información en mayúsculas y como objeto JSON con estas llaves:  
    { tipoCostura: string|null, diametro: string|null, cedula: string|null }
      
    Descripción: """${descripcion}"""
`;

    const resp = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: "system",
          content: "Eres un asistente que ayuda a extraer información estructurada de descripciones de productos industriales.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    let content = resp.choices[0].message.content as string;
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(content);

    // Normalización adicional: quitar guion y poner espacio en diámetros
    if (result.diametro && result.diametro.includes('-')) {
      result.diametro = result.diametro.replace(/-/g, ' ').replace(/\s+/, ' ').toUpperCase();
    }
    // Siempre poner símbolo de pulgadas al final si no lo tiene
    if (result.diametro && !result.diametro.includes('"')) {
      result.diametro = result.diametro.trim() + '"';
    }

    return result;
  }


  //  - material:  Material principal, por ejemplo "ACERO AL CARBON", "INOXIDABLE", PVC, CPVC, PPR, HDPE, PEAD, POLIETILENO, POLIPROPILENO,  etc. Si no se encuentra, pon null.
  //   - diameter: Diámetro nominal principal en pulgadas, sin el símbolo ", por ejemplo: 2 1/2, 3, 4, etc. Si viene en otro formato, conviértelo a ese (por ejemplo, 2-1/2" debe ser 2 1/2) o  Diámetro nominal principal, sin símbolo de pulgadas ni comillas (ejemplo: 10, 10 1/2, 8, 4 1/2, etc.).
  //   - ced: Extrae la cédula (puede aparecer como CED, SCH, STD, 10, 40, 80, XXS, etc). Si no se encuentra, pon null..,
  //   - costura:  Si la descripción menciona SIN COSTURA, SC, S.C., S/C, S.C, indica "SIN COSTURA", Si menciona CON COSTURA, CC, C.C., C/C, C.C, indica "CON COSTURA" ,Si no encuentras ninguna variante, pon null. 
  //   - termino:'',
  //   - acabado:'',
  //   - subtipo:'',
  //   - figura: Si la descripción contiene una figura, código tipo FIGURA, FIG., F o F. seguido de letras/números, pon el valor tal cual o Si hay un código o figura (ejemplo: F13, FIGURA 13, etc.), si no se encuentra pon null.,
  //   - radio:  Si la descripción indica "radio largo", "RL" o similar, pon "LARGO". Si dice "radio corto", "RC" o similar, pon "CORTO". Si no se encuentra, pon null.,
  //   - angulo: Valor del ángulo en grados, como 45 o 90. Si no se encuentra, pon null,
  //   - tipo:'',
  //   - grado:'',
  //   - presion: Valor numérico de la presión, por ejemplo 6000;  o Valor numérico de presión en LBS (ejemplo: 150, 300, 600, etc.), si no se encuentra pon null.


  async extractProductProperties(description: string): Promise<any> {
    const prompt = `
    Eres un asistente experto en productos industriales. Analiza la siguiente descripción y extrae:
      
    - material:  Material principal, por ejemplo "ACERO AL CARBON", "INOXIDABLE", PVC, CPVC, PPR, HDPE, PEAD, POLIETILENO, POLIPROPILENO,  etc. Si no se encuentra, pon null.
    - diameter: Diámetro nominal principal en pulgadas, sin el símbolo ", por ejemplo: 2 1/2, 3, 4, etc. Si viene en otro formato, conviértelo a ese (por ejemplo, 2-1/2" debe ser 2 1/2) o  Diámetro nominal principal, sin símbolo de pulgadas ni comillas (ejemplo: 10, 10 1/2, 8, 4 1/2, etc.).
    - ced: Extrae la cédula (puede aparecer como CED, SCH, STD, 10, 40, 80, XXS, etc). Si no se encuentra, pon null..,
    - costura:  Si la descripción menciona SIN COSTURA, SC, S.C., S/C, S.C, indica "SIN COSTURA", Si menciona CON COSTURA, CC, C.C., C/C, C.C, indica "CON COSTURA" ,Si no encuentras ninguna variante, pon null. 


    - figura: Si la descripción contiene una figura, código tipo FIGURA, FIG., F o F. seguido de letras/números, pon solo el valor numerico ejemplo: FIGURA 920 -> 920 ; si no, pon null.
    - radio:  Si la descripción indica "radio largo", "RL" o similar, pon "LARGO". Si dice "radio corto", "RC" o similar, pon "CORTO". Si no se encuentra, pon null.,
    - angulo: Valor del ángulo en grados, como 45 o 90. Si no se encuentra, pon null,
    - tipo:'',
    - grado:'',
    - presion: Valor numérico de la presión, por ejemplo 6000;  o Valor numérico de presión en LBS (ejemplo: 150, 300, 600, etc.), si no se encuentra pon null.


      Descripción: ${description}
                
        Dame la información en un objeto JSON con los siguientes nombres exactos de propiedad:
                
        {
          material: ...,
          diameter: ...,
          ced: ...,
          costura: ...,
          figura: ...,
          radio: ...,
          angulo: ...,
          presion: ...,
        }

  
`;

    const resp = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: "system",
          content: "Eres un asistente que ayuda a extraer información estructurada de descripciones de productos industriales.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    let content = resp.choices[0].message.content as string;
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(content);

    // Normalización adicional: quitar guion y poner espacio en diámetros
    if (result.diametro && result.diametro.includes('-')) {
      result.diametro = result.diametro.replace(/-/g, ' ').replace(/\s+/, ' ').toUpperCase();
    }
    // Siempre poner símbolo de pulgadas al final si no lo tiene
    if (result.diametro && !result.diametro.includes('"')) {
      result.diametro = result.diametro.trim() + '"';
    }

    return result;
  }

  async extractCodoProperties(descripcion: string) {
    const response = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en productos industriales que extrae datos clave de descripciones para integración en un sistema de inventarios.',
        },
        {
          role: 'user',
          content: `
         Extrae los siguientes campos clave de la descripción de un codo industrial. Devuelve todos los datos en MAYÚSCULAS, sin acentos, y si no se encuentra un valor, pon null.

        - producto: Si la descripción indica que es un codo, pon "CODO"; si no, pon null.
        - diametro: Diámetro nominal principal en pulgadas, sin el símbolo ", por ejemplo: 2 1/2, 3, 4, etc. Si viene en otro formato, conviértelo a ese (por ejemplo, 2-1/2" debe ser 2 1/2).
        - cedula: Valor numérico de la cédula o "STD" para cédula estándar, si no se encuentra, pon null.
        - angulo: Valor del ángulo en grados, como 45 o 90. Si no se encuentra, pon null.
        - radio: Si la descripción indica "radio largo", "RL" o similar, pon "LARGO". Si dice "radio corto", "RC" o similar, pon "CORTO". Si no se encuentra, pon null.
        - material: Material principal, por ejemplo "ACERO AL CARBON", "INOXIDABLE", etc. Si no se encuentra, pon null.
        - galvanizado: Si hay alguna variante de galvanizado, pon "G"; si no, pon null.
        - roscado: Si hay alguna variante de roscado, pon "R"; si no, pon null.
        - liso: Si hay alguna variante de liso, pon "L"; si no, pon null.
        - negro: Si hay alguna variante de negro, pon "N"; si no, pon null.
        - figura: Si hay una figura o código, pon el valor como está; si no, pon null.
        - presion: Valor numérico de la presión, por ejemplo 6000; si no se encuentra, pon null.
        - sw: Si aparece "SW", "SOCKET WELD" o similares, pon "SW"; si no, pon null.
        - biselado: Si aparece "BISELADO" o similar, pon "BISELADO"; si no, pon null.
        - plano: Si aparece "PLANO", pon "PLANO"; si no, pon null.
        - ranurado: Si aparece "RANURADO" o variantes, pon "RANURADO"; si no, pon null.
        - bridado: Si aparece "BRIDADO", pon "BRIDADO"; si no, pon null.
        - no_asignado: Si aparece "NO ASIGNADO", pon "NO ASIGNADO"; si no, pon null.
        - descripcion_limpia: Un resumen limpio y técnico de la descripción usando los datos extraídos, útil para búsqueda.
                
        Descripción: ${descripcion}
                
        Dame la información en un objeto JSON con los siguientes nombres exactos de propiedad:
                
        {
          producto: ...,
          diametro: ...,
          cedula: ...,
          angulo: ...,
          radio: ...,
          material: ...,
          galvanizado: ...,
          roscado: ...,
          liso: ...,
          negro: ...,
          figura: ...,
          presion: ...,
          sw: ...,
          biselado: ...,
          plano: ...,
          ranurado: ...,
          bridado: ...,
          no_asignado: ...,
          descripcion_limpia: ...
        }
          `,
        },
      ],
      temperature: 0.3,
    });

    let data = response.choices[0]?.message?.content || '';

    // Limpieza del formato de código
    if (data.startsWith('```json')) {
      data = data.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    if (data.startsWith('```')) {
      data = data.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(data);
    } catch (err) {
      console.error('Error al parsear respuesta de OpenAI:', data);
      return null;
    }
  }

  //  - TUBO PLASTICO (incluye términos como tubo plástico, tubería plástica, tubo pvc, tubería pvc, plastic pipe, pvc pipe, tubo ppr, tubería ppr, tubo hdpe, tubería hdpe, tubo cpvc, tubería cpvc, polietileno, polipropileno, polyethylene, polypropylene, etc.)

  // async detectarTipoProducto(descripcion: string): Promise<"TUBO" | "CODO" | "VALVULA" | "BRIDA" | null> {
  //   const prompt = `
  //     Analiza la siguiente descripción de producto y responde únicamente con el tipo de producto principal.
  //     Las únicas opciones posibles son:
  //     - TUBO (incluye términos como tubería, tubo, pipe, piping, etc. pero que NO sea de plástico)

  //     - CODO (incluye términos como codo, elbow, etc.)
  //     - VALVULA (incluye términos como válvula, valvula, valve, etc.)
  //     - BRIDA (incluye términos como brida, flange, etc.)

  //     Si no encuentras ninguna, responde SOLO con null.
  //     No des ninguna explicación adicional, solo la palabra exacta (TUBO, TUBO PLASTICO, CODO, VALVULA, BRIDA o null), en mayúsculas y sin acentos.
  //     Descripción: "${descripcion}"
  //   `;


  //   const resp = await this.openai.chat.completions.create({
  //     model: 'chatgpt-4o-latest',
  //     messages: [
  //       {
  //         role: 'system',
  //         content: 'Eres un asistente para clasificar productos industriales como TUBO, TUBO PLASTICO, CODO, VALVULA o BRIDA.',
  //       },
  //       {
  //         role: 'user',
  //         content: prompt,
  //       }
  //     ],
  //     temperature: 0,
  //     max_tokens: 10,
  //   });

  //   let tipo = resp.choices[0].message.content?.trim().toUpperCase() || '';
  //   if (
  //     ["TUBO", "TUBO PLASTICO", "CODO", "VALVULA", "BRIDA"].includes(tipo)
  //   ) return tipo as "TUBO" | "CODO" | "VALVULA" | "BRIDA";
  //   return null;
  // }




  private normalize(s: string) {

    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  }

  // =======================
  // Clasificador (sin sinónimos en código)
  // =======================
  async detectarTipoProducto(descripcion: string): Promise<ProductoTipo | null> {
    const opciones = PRODUCT_OPTIONS.join('\n- ');

    // --- Sinónimos y reglas SOLO en el prompt ---
    const synonymGuide = `
Guia de sinonimos / palabras clave (NO son respuestas validas; mapea a las opciones):
- PIPE, PIPING, TUBE, LINE PIPE -> TUBO
- ELBOW, BEND -> CODO
- FLANGE, WELD NECK, SLIP ON, BLIND FLANGE, LAP JOINT, SO FLANGE, SW FLANGE -> BRIDA
- VALVE, GATE VALVE, GLOBE VALVE, BALL VALVE, CHECK VALVE, BUTTERFLY VALVE, PLUG VALVE -> VALVULA
- COUPLING -> ACOPLAMIENTO
- UNION -> UNION
- NIPPLE -> NIPLE
- REDUCER -> REDUCCION
- TEE -> TEE
- OUTLET -> OUTLET
- SOCKOLET -> SOCKOLET, WELDOLET -> WELDOLET, ELBOLET -> ELBOLET, THREDOLET -> THREDOLET
- STRAINER, FILTER -> FILTRO
- GASKET -> EMPAQUE
- O RING, ORING -> SELLO
- GLAND PACKING -> GLANDULA
- CLAMP -> ABRAZADERA
- TAPE -> CINTA
- MANOMETER, GAUGE -> MANOMETRO
- LUBRICANT -> LUBRICANTE
- POINT SYSTEM -> SISTEMA
  `.trim();

    const prompt = `
Analiza la siguiente descripcion de producto y responde SOLO con la categoria principal.
Devuelve exactamente UNA etiqueta de la lista (en MAYUSCULAS, sin acentos). Si no aplica, devuelve: null.

Opciones EXACTAS:
- ${opciones}

${synonymGuide}

Reglas:
- Responde solo con la etiqueta exacta (sin explicaciones).
- Si hay varias pistas, elige la mas especifica de la lista.
- Ignora marcas, colores y adornos.
Descripcion: "${descripcion}"
`.trim();

    const resp = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: 'system',
          content:
            'Clasifica descripciones de productos industriales en una lista cerrada. Responde solo con una etiqueta exacta de la lista o con null.',
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const raw = (resp.choices[0].message.content || '').trim().replace(/^"|"$/g, '');
    const tipo = this.normalize(raw) as ProductoTipo | null;


    return tipo

    // Validacion estricta contra la lista
    const allowed = new Set(PRODUCT_OPTIONS.map(this.normalize));
    if (allowed.has(tipo)) {
      // devuelve el literal original tal cual en PRODUCT_OPTIONS
      const idx = PRODUCT_OPTIONS.findIndex(o => this.normalize(o) === tipo);
      return PRODUCT_OPTIONS[idx];
    }
    return null;
  }



  async extractValvulaProperties(descripcion: string): Promise<ValvulaProperties> {
    const response = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en productos industriales que extrae datos clave de descripciones de válvulas para integración en un sistema de inventarios.',
        },
        {
          role: 'user',
          content: `
            Extrae los siguientes campos clave de la descripción de una válvula industrial. Devuelve todos los datos en MAYÚSCULAS, sin acentos. Si no se encuentra un valor, pon null.
                    
            - producto: Si la descripción indica que es una válvula, pon "VALVULA"; si no, pon null.
            - subtipo: El subtipo o clase principal de la válvula, por ejemplo: BOLA, GLOBO, MARIPOSA, AGUJA, CHECK, ALIVIO, PRESION, etc. Si no se encuentra, pon null.
            - diametro: Diámetro nominal principal en pulgadas, sin el símbolo ", por ejemplo: 2 1/2, 3, 4, etc. Si viene en otro formato como 2-1/2", conviértelo a ese formato (2 1/2).
            - figura: Si la descripción contiene una figura, código tipo FIGURA, FIG., F o F. seguido de letras/números, pon el valor tal cual; si no, pon null.
                    
            Descripción: ${descripcion}
                    
            Dame la información en un objeto JSON con los siguientes nombres exactos de propiedad:
                    
            {
              producto: ...,
              subtipo: ...,
              diametro: ...,
              figura: ...
            }
                    `
        }
      ],
      temperature: 0.3,
    });

    let data = response.choices[0]?.message?.content || '';

    // Limpieza del formato de código
    if (data.startsWith('```json')) {
      data = data.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    if (data.startsWith('```')) {
      data = data.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      return JSON.parse(data) as ValvulaProperties;
    } catch (err) {
      console.error('Error al parsear respuesta de OpenAI:', data);
      return null;
    }
  }



  async extractBridaProperties(descripcion: string): Promise<BridaProperties | null> {
    const prompt = `
    Extrae los siguientes campos clave de la descripción de una brida industrial. Devuelve todos los datos en MAYÚSCULAS, sin acentos, y si no se encuentra un valor, pon null.
      
    - producto: Si la descripción indica que es una brida, pon "BRIDA"; si no, pon null.
    - diametro: Diámetro nominal principal, sin símbolo de pulgadas ni comillas (ejemplo: 10, 10 1/2, 8, 4 1/2, etc.).
    - cedula: Valor de la cédula o "STD" si es estándar, si no se encuentra, pon null.
    - tipo_cuello: Tipo de cuello si lo tiene (ejemplo: "CIEGA", "CUELLO", "ROSCA", "PLANA", "LAPJOINT"), si no se encuentra pon null.
    - material: Material principal, por ejemplo "ACERO AL CARBON", "INOXIDABLE", etc., si no se encuentra pon null.
    - presion: Valor numérico de presión en LBS (ejemplo: 150, 300, 600, etc.), si no se encuentra pon null.
    - norma: Norma de fabricación (ejemplo: ANSI, DIN, SO, API, etc.), si no se encuentra pon null.
    - t_material: Si viene T-304, T-304L, T-316L, etc. (el valor después de T-), si no se encuentra pon null.
    - cara: Tipo de cara (ejemplo: REALZADA, PLANA, ANILLO), si no se encuentra pon null.
    - figura: Si hay un código o figura (ejemplo: F13, FIGURA 13, etc.), si no se encuentra pon null.
    - descripcion_limpia: Un resumen limpio y técnico de la descripción usando los datos extraídos.
      
    Descripción: ${descripcion}
      
    Dame la información en un objeto JSON con los siguientes nombres exactos de propiedad:
      
    {
      producto: ...,
      diametro: ...,
      cedula: ...,
      tipo_cuello: ...,
      material: ...,
      presion: ...,
      norma: ...,
      t_material: ...,
      cara: ...,
      figura: ...,
      descripcion_limpia: ...
    }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'chatgpt-4o-latest',
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente experto en productos industriales que extrae datos clave de descripciones para integración en un sistema de inventarios.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    let data = response.choices[0]?.message?.content || "";

    // Limpieza del formato de código si viene como bloque markdown
    if (data.startsWith("```json")) {
      data = data.replace(/^```json/, "").replace(/```$/, "").trim();
    }
    if (data.startsWith("```")) {
      data = data.replace(/^```/, "").replace(/```$/, "").trim();
    }

    try {
      return JSON.parse(data);
    } catch (err) {
      console.error("Error al parsear respuesta de OpenAI:", data);
      return null;
    }
  }




  async extractTuboPlasticoProperties(descripcion: string): Promise<TuboPlasticoProperties | null> {
    const prompt = `
    Analiza la siguiente descripción de producto y extrae únicamente estos campos clave.
    Devuelve todos los valores en MAYÚSCULAS, sin acentos. Si no hay valor, pon null.
      
    - producto: Si la descripción indica que es un tubo plástico, pon "TUBO PLASTICO"; si no, pon null.
    - material: El tipo de plástico si está presente, por ejemplo PVC, CPVC, PPR, HDPE, PEAD, POLIETILENO, POLIPROPILENO, etc. Si no lo encuentras, pon null.
    - diametro: Diámetro nominal principal, en pulgadas o milímetros, sin símbolos (por ejemplo: 2 1/2, 3, 4, 63, 110, etc. Convierte 2-1/2" a 2 1/2, y 063MM a 63).
    - cedula: Valor numérico de la cédula si está presente (por ejemplo: 40, 80), o "SCH40", "SCH80", "CED 40", etc. Si no lo encuentras, pon null.
    - descripcion_limpia: Un resumen limpio y técnico de la descripción usando los datos extraídos, útil para búsqueda.
      
      Dame la información en un objeto JSON con los siguientes nombres exactos de propiedad:

    Ejemplo de formato de salida:
    {
      producto: "TUBO PLASTICO",
      material: "PVC",
      diametro: "63",
      cedula: "40",
      descripcion_limpia: "TUBO PVC 63MM CED 40"
    }
      
    Descripción: ${descripcion}
      
    Devuelve SOLO el objeto JSON.
    `;

    const response = await this.openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente experto en productos industriales que extrae datos clave de descripciones para integración en un sistema de inventarios.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    let data = response.choices[0]?.message?.content || "";

    // Limpieza si viene en formato markdown o code block
    if (data.startsWith("```json")) {
      data = data.replace(/^```json/, "").replace(/```$/, "").trim();
    }
    if (data.startsWith("```")) {
      data = data.replace(/^```/, "").replace(/```$/, "").trim();
    }

    try {
      return JSON.parse(data) as TuboPlasticoProperties;
    } catch (err) {
      console.error("Error al parsear respuesta de OpenAI:", data);
      return null;
    }
  }


}