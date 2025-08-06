import { GenerateSummaryDto } from "../dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../entities/gpt.entity";
import { QuotationEntity } from "../entities/quotation.entity";
import { SummaryEntity } from "../entities/summary.entity";

export type TuboPlasticoProperties = {
  producto: "TUBO PLASTICO" | null;
  material: string | null;
  diametro: string | null;
  cedula: string | null;
  descripcion_limpia: string | null;
};

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

export interface BridaProperties {
  producto: string | null; // "BRIDA" si lo detecta, si no null
  diametro: string | null; // Ej: 10, 10 1/2, 8, 4 1/2 (sin comillas ni pulgadas)
  cedula: string | null;   // Ej: "40", "STD", etc.
  tipo_cuello: string | null; // Ej: "CIEGA", "CUELLO", "ROSCA", "PLANA", "LAPJOINT", etc.
  material: string | null; // Ej: "ACERO AL CARBON", "INOXIDABLE", etc.
  presion: string | null;  // Ej: "150", "300", "600", "2500", etc.
  norma: string | null;    // Ej: "ANSI", "DIN", "SO", "API", etc.
  t_material: string | null; // Ej: "304L", "316L", etc. (el número después de T-)
  cara: string | null; // Ej: "REALZADA", "PLANA", "ANILLO", etc.
  figura: string | null; // Si viene "F", "FIG", "FIGURA" seguido de número/código
  descripcion_limpia: string | null; // Texto limpio y técnico
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

  abstract detectarTipoProducto(descripcion: string): Promise<"TUBO" | "TUBO PLASTICO" | "CODO" | "VALVULA" | "BRIDA" | null>

  abstract extractValvulaProperties(description: string): Promise<ValvulaProperties>

  abstract extractBridaProperties(descripcion: string): Promise<BridaProperties | null>

  abstract extractTuboPlasticoProperties(descripcion: string): Promise<TuboPlasticoProperties | null>
}