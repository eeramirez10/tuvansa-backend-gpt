import { GenerateSummaryDto } from "../dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../entities/gpt.entity";
import { QuotationEntity } from "../entities/quotation.entity";
import { SummaryEntity } from "../entities/summary.entity";

export interface CodoData {
  producto: string | null;
  diametro: string | null;
  cedula: string | null;
  angulo: string | null;
  radio: "LARGO" | "CORTO" | null;
  material: string | null;
  galvanizado: "G" | null;
  roscado: "R" | null;
  liso: "L" | null;
  negro: "N" | null;
  figura: string | null;
  presion: string | null;
  sw: "SW" | null;
  biselado: "BISELADO" | null;
  plano: "PLANO" | null;
  ranurado: "RANURADO" | null;
  bridado: "BRIDADO" | null;
  no_asignado: "NO ASIGNADO" | null;
  descripcion_limpia: string | null;
}

export interface ValvulaProperties {
  producto: "VALVULA" | null;
  subtipo: string | null;
  diametro: string | null; // ejemplo: "2 1/2", "3"
  figura: string | null;
}


export abstract class LanguageModelService {

  abstract processPromptForSQL(process: ProcessPromptForSqlDto, dbSchema: string): Promise<GptEntity>

  abstract generateSummary(generateSummaryDto: GenerateSummaryDto): Promise<SummaryEntity>

  abstract extractQuotationData(textContent: string): Promise<QuotationEntity[]>

  abstract embed(text: string): Promise<void>

  abstract detectCosturaType(descripcion: string): Promise<"SIN COSTURA" | "CON COSTURA" | null>

  abstract extractPipeProperties(descripcion: string): Promise<{
    tipoCostura: "CON COSTURA" | "SIN COSTURA" | null;
    diametro: string | null;
    cedula: string | null;
  }>

  abstract extractCodoProperties(descripcion: string): Promise<CodoData>

  abstract detectarTipoProducto(descripcion: string): Promise<"TUBO" | "CODO" | "VALVULA" | null>

  abstract extractValvulaProperties(description:string): Promise<ValvulaProperties>
}