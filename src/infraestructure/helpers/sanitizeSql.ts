export function sanitizeSQL(sql: string): string {
  return sql.replace(/\bLIMIT\s+\d+/gi, '')
    .replace(/\bOFFSET\s+\d+/gi, '')
    .trim();
}




export interface RadioAngulo {
  angulo: string | null; // Ejemplo: "45", "90", etc.
  radio: "LARGO" | "CORTO" | null;
}

export function extractAnguloRadio(descripcion: string): RadioAngulo {

  if (!descripcion) return { angulo: null, radio: null }
  // Extrae el ángulo: número seguido de o, O, ° o grados (también soporta "GRADOS" o "grados")
  const anguloMatch = descripcion.match(/(\d+(?:\.\d+)?)\s*(?:[oO°]|GRADOS?)/i);

  // Extrae radio largo/corto: RL, RC, RADIO LARGO, RADIO CORTO
  const radioMatch = descripcion.match(/\b(RL|RC|RADIO\s*LARGO|RADIO\s*CORTO)\b/i);

  let angulo: string | null = null;
  if (anguloMatch) {
    angulo = anguloMatch[1];
  }

  let radio: "LARGO" | "CORTO" | null = null;
  if (radioMatch) {
    const match = radioMatch[1].toUpperCase().replace(/\s+/g, '');
    if (match === "RL" || match === "RADIOLARGO") {
      radio = "LARGO";
    } else if (match === "RC" || match === "RADIOCORTO") {
      radio = "CORTO";
    }
  }

  return { angulo, radio };
}

export function normalizarDescripcionSWPorCedula(
  descripcion: string,
  cedula: string | null | undefined
): string {

  // Regex para variantes de SW (SW, S.W., S W, etc.)
  const swRegex = /\bS[\s\.]?W[\s\.]?\b/gi;

  const descMayus = descripcion.toUpperCase().trim();
  const cedulaMayus = (cedula || '').toUpperCase().trim();

  // Si la cédula es STD o STANDARD, SW en la descripción es cédula STD
  if (cedulaMayus === 'STD' || cedulaMayus === 'STANDARD') {
    return descMayus.replace(swRegex, 'STD');
  }
  // Si no, cualquier SW es SOCKET WELD
  return descMayus.replace(swRegex, ' SOCKET WELD ');
}

export function extraerCedulaDeDescripcion(descripcion: string): string | null {
  const desc = descripcion.toUpperCase();

  // Buscar STD o STANDARD como cédula
  if (desc.match(/\b(STD|STANDARD)\b/)) {
    return 'STD';
  }

  // Buscar patrones como CEDULA 40, C 40, SCH 80, SCHEDULE 80, etc.
  const patrones = [
    /\bC(?:EDULA)?\s*([0-9]+)/,        // C 40, CEDULA 40
    /\bSCH(?:EDULE)?\s*([0-9]+)/,      // SCH 80, SCHEDULE 80
    /\bC\.\s*([0-9]+)/,                // C. 40
    /\bSCH\.\s*([0-9]+)/,              // SCH. 40
  ];

  for (const pat of patrones) {
    const match = desc.match(pat);
    if (match) return match[1];
  }

  return null;
}

export function extraerFiguraDeDescripcion(descripcion: string): string | null {
  const desc = descripcion.toUpperCase();

  // Busca FIGURA, FIG., FIG, F., F seguidos (con o sin espacios/puntos/guiones) de la figura (debe iniciar con número)
  const patron = /\b(?:FIGURA|FIG\.?|F\.?)[\s\-.]*([0-9][A-Z0-9\-]*)/;

  const match = desc.match(patron);
  if (match) {
    return match[1].replace(/\./g, '').replace(/\s+/g, '').trim();
  }

  return null;
}

export function normalizarGrados(descripcion: string): string {
  if (descripcion.includes('°')) {
    // Si contiene el símbolo de grados, lo reemplaza por "O"
    return descripcion.replace(/°/g, 'O');
  }
  // Si no contiene el símbolo, regresa igual
  return descripcion;
}

export function normalizeValue(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  // Quita acentos, convierte a mayúsculas y limpia espacios extras
  return value
    .normalize("NFD")                      // Quita diacríticos
    .replace(/[\u0300-\u036f]/g, "")       // Quita tildes
    .replace(/\s+/g, " ")                  // Un solo espacio
    .trim()
    .toUpperCase();
}

export function cleanDiameter(diametro: string): string {
  // Quita comillas dobles, simples y espacios alrededor
  return diametro.replace(/["']/g, '').trim();
}