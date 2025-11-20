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

  // Busca coincidencias: CED, CED., CEDULA, SCH seguidas de valor (numérico o STD)
  const regex = /\b(CED\.?|CEDULA|SCH)\s*\.?\s*(STD|\d+)\b/;
  const match = desc.match(regex);

  if (match) {
    return match[2]; // El valor de la cédula ("40", "STD", etc.)
  }

  // Si no encuentra, busca solo "STD" (estándar)
  const stdRegex = /\bSTD\b/;
  if (desc.match(stdRegex)) {
    return "STD";
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

export function extraerPresion(descripcion: string): string | null {
  const desc = descripcion.toUpperCase();

  // Busca presiones tipo "150 LBS", "150 PSI", "150LB", "LBS 150", etc.
  const regex = /\b(\d{2,5}(?:\.\d{1,2})?)\s*(LBS?|LB|LIBRAS?|PSI|POUNDS?|PRESSURE)\b|\b(LBS?|LB|LIBRAS?|PSI|POUNDS?|PRESSURE)[\s\-:]*(\d{2,5}(?:\.\d{1,2})?)\b/;
  const match = desc.match(regex);

  // El número estará en el grupo 1 o grupo 4
  if (match) {
    return match[1] || match[4] || null;
  }
  return null;
}


export function quitarPalabraBrida(texto: string): string {
  // Normalizamos acentos para evitar problemas con 'BRÍDA'
  const textoNormalizado = texto.normalize('NFD').replace(/[\u0301\u0308]/g, '');
  // Reemplazamos cualquier aparición de "BRIDA" o "BRIDAS" (sing/plur) como palabra completa
  const textoSinBrida = textoNormalizado.replace(/\bbridas?\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  return textoSinBrida;
}

export function extraerGradoMaterialBrida(descripcion: string): string | null {
  // Busca T-304, T-304L, T304, T316, T-316L, etc.
  const patron = /\bT[-\s]?(\d{3}[A-Z]*)\b/gi;
  const desc = descripcion.toUpperCase();
  const match = patron.exec(desc);

  if (match) {
    // Devuelve en formato estándar, por ejemplo: T-304L
    // Si venía como T304L, lo formatea a T-304L
    const grado = match[1];
    const gradoFormateado = `T-${grado}`;
    return gradoFormateado;
  }
  return null;
}


export const verifyData = (value: string): string | null => {

  if(value === 'NO ASIGNADO' || !value) return null

  return value

}


