import { GenerateSummaryDto } from "../dtos/generate-summary.dto";
import { ProcessPromptForSqlDto } from "../dtos/process-prompt-for-sql.dto";
import { GptEntity } from "../entities/gpt.entity";
import { QuotationEntity } from "../entities/quotation.entity";
import { SummaryEntity } from "../entities/summary.entity";



export const PRODUCT_OPTIONS = [
  "TUBO", "CODO", "VALVULA", "BRIDA",
  "ABRAZADERA","ADAPTADOR", "ACCESORIOS", "ACOPLAMIENTO", "ACTUADOR", "AGUJA", "ALARMA",
  "ANCLAJE", "ANGULO", "ANILLO", "ARANDELA", "ARCO", "ASPERSOR", "AUMENTADOR",
  "BALERO", "BANDEJA", "BARANDAL", "BARRA", "BASCULA", "BASE", "BATERIA",
  "BICICLETA", "BIODIGESTOR", "BLOQUEADOR", "BOMBA", "BOQUILLA", "BOTA", "BOTE",
  "BOTELLA", "BOTIQUIN", "BROCA", "BROCAL", "BROCHA", "CABEZAL", "CABLE", "CAJA",
  "CALCA", "CAMARA", "CAMPANA", "CANAL", "CANDADO", "CARRETE", "CEMENTO",
  "CERTIFICADO", "CHALUPA", "CHAPADO", "CHAVETA", "CHIFLON", "CINCHO", "CINTA",
  "CISTERNA", "CLAVO", "CLIP", "COLECTOR", "COLA COCHINO", "COLADERA",
  "COLGADOR", "COLGANTE", "COMPRESOR", "CONDULET", "CONECTOR", "CONTACTO",
  "CONTRABRIDA", "COPLE", "CORTE", "CUADRO", "CUBETA", "CUELLO", "CUERDA",
  "CUNA", "DADO", "DETECTOR", "DIAFRAGMA", "DIFUSOR", "DISCO", "ELECTRODO",
  "EMISOR", "EMPAQUE", "ENSAMBLE", "ENTRADA", "EQUIPO", "ESCALON", "ESPARRAGO",
  "ESPATULA", "ESTACION", "ESTROBO", "ETIQUETA", "FERULA", "FIBRA", "FILTRO",
  "FLOTADOR", "FUENTE", "GABINETE", "GLAND", "GLANDULA", "GRANADA", "GRAPA",
  "GRASA", "GUANTE", "HIDRANTE", "HIERRO", "HILO", "HOJA", "IMPERMEABLE",
  "IMPULSOR", "INSERTO", "INTERRUPTOR", "JUEGO", "JUNTA", "KIT", "LAMINA",
  "LAMPARA", "LATERAL", "LIJA", "LIMA", "LIMPIADOR", "LIQUIDO", "LLAVE",
  "LUBRICANTE", "MALETA", "MANIFOLD", "MANOMETRO", "MAQUINA", "MATRICES",
  "MEDIDOR", "MESA", "MEZCLADOR", "MIRILLA", "MODULO", "MONTURA", "MORDAZA",
  "MOTOBOMBA", "MOTOR", "NIPLE", "NIPOLET", "OUTLET", "PALA", "PALETA", "PANEL",
  "PEGAMENTO", "PERFIL", "PERNO", "PIJA", "PISTOLA", "PLACA", "PLATO", "PLAYERA",
  "SISTEMA", "PORTA", "PORTABRIDA", "POSTE", "PPRC", "PRESOSTATO",
  "PRIMER", "RACK", "RASTRILLO", "RAIN", "REDUCCION", "REGISTRO", "RESISTENCIA",
  "RESTRICTOR", "RODILLO", "ROLDANA", "ROLLO", "ROTOR", "RUEDA", "SALIDA",
  "SALVATUBOS", "SEGUETA", "SELLADOR", "SELLO", "SENAL", "SEPARADOR", "SET",
  "SILICON", "SIRENA", "SOLDADURA", "SOLERA", "SOLVENTE", "SOMBRERO", "SOPORTE",
  "STANDARD", "STUB-END", "SUAJE", "SUBMERS", "TABLERO", "TANQUE", "TAPA",
  "TAPON", "TAQUETE", "TEE", "TELA", "TERMINAL", "TERMOMETRO", "TERMOPOZO",
  "TERMOSTATO", "TERRAJA", "THREDOLET", "TIJERAS", "TINACO", "TOBERA", "TOMA",
  "TORNILLO", "TRAMO", "TUERCA", "UNICANAL", "UNION", "VIDRIO", "VIGA",
  "WELDOLET", "WHITE", "YEE", "ELBOLET", "SOCKOLET"
] as const;

export type ProductoTipo = typeof PRODUCT_OPTIONS[number];

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

  abstract extractProductProperties(description: string): Promise<any>

  abstract extractCodoProperties(descripcion: string): Promise<CodoData>

  abstract detectarTipoProducto(descripcion: string): Promise<ProductoTipo | null>

  abstract extractValvulaProperties(description: string): Promise<ValvulaProperties>

  abstract extractBridaProperties(descripcion: string): Promise<BridaProperties | null>

  abstract extractTuboPlasticoProperties(descripcion: string): Promise<TuboPlasticoProperties | null>
}