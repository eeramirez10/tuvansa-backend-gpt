// analyze-result.ts
export type AnalyzeResult = {
  id: string
  product: string | null;              // 'VALVULA' | 'CODO' | 'TUBO' | 'BRIDA' | ...
  material: string | null;             // ACERO, PVC, CPVC, HDPE, etc.
  diameter: string | null;             // diámetro limpio
  ced: string | null;                  // cédula (o SW)
  termino: string | null;              // RANURADO, ROSCADO, SW, etc.
  acabado: string | null;              // NEGRO, GALVANIZADO, ROJA, etc.
  subtipo: string | null;              // subfamilia/figura comercial para válvulas
  figura: string | null;               // figura extraída del texto (si aplica)
  radio: string | null;                // radio (codos)
  angulo: string | null;               // ángulo (codos)
  costura: string | null;              // costura (tubos)
  tipo: string | null;                 // tipo (bridas, tubos plásticos, etc.)
  grado: string | null;                // grado/ASTM/clase (bridas)
  presion: string | null;              // presión/clase (bridas)
  originalDescription: string | null;  // descripción original elegida
  ean: string | null;                  // EAN
  description: string | null;        // descripción enriquecida/normalizada (para embeddings)
};

export const ANALYZE_RESULT_EMPTY: AnalyzeResult = {
  id: '',
  product: null,
  material: null,
  diameter: null,
  ced: null,
  termino: null,
  acabado: null,
  subtipo: null,
  figura: null,
  radio: null,
  angulo: null,
  costura: null,
  tipo: null,
  grado: null,
  presion: null,
  originalDescription: null,
  ean: null,
  description: null,
};

export const analizeResultMapper = (json: Record<string, string | null>): AnalyzeResult => {

  return {
    id: json.id,
    product: json.product,
    material: json.material,
    diameter: json.diameter,
    ced: json.ced,
    termino: json.termino,
    acabado: json.acabado,
    subtipo: json.subtipo,
    figura: json.figura,
    radio: json.radio,
    angulo: json.angulo,
    costura: json.costura,
    tipo: json.tipo,
    grado: json.grado,
    presion: json.presion,
    originalDescription: json.originalDescription,
    ean: json.ean,
    description: json.description,
  }

}

const NULL_MARKERS = new Set(['', 'NO ASIGNADO', 'N/A', 'NA']);

export const nn = (v?: string | null) =>
  v && !NULL_MARKERS.has(v.toUpperCase().trim()) ? v.trim() : null;

type BuildOpts = {
  normalizeValue?: (s: string) => string;   // tu normalizeValue
  cleanDiameter?: (s: string) => string;    // tu cleanDiameter
};

// Crea un AnalyzeResult completo a partir de un parcial
export const buildAnalyzeResult = (
  partial: Partial<AnalyzeResult>,
  opts?: BuildOpts
): AnalyzeResult => {
  const out: AnalyzeResult = {
    ...ANALYZE_RESULT_EMPTY,
    ...analizeResultMapper(partial)
  };

  // Garantiza nulls y trims
  (Object.keys(out) as (keyof AnalyzeResult)[]).forEach((k) => {
    const v = out[k];
    if (typeof v === 'string') out[k] = nn(v) as any;
  });

  // Normalizaciones opcionales usando tus helpers
  if (out.material && opts?.normalizeValue) out.material = nn(opts.normalizeValue(out.material));
  if (out.description && opts?.normalizeValue) out.description = nn(opts.normalizeValue(out.description));
  if (out.diameter && opts?.cleanDiameter) out.diameter = nn(opts.cleanDiameter(out.diameter));

  // Algunas convenciones útiles
  if (out.ced) out.ced = out.ced.toUpperCase();

  return out;
};


