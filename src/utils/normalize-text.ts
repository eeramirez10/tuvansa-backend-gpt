

export function normalizarTubo(texto: string) {
  return texto.replace(/\btubos\b/gi, 'tubo');
}

export function extraerDesdeTubo(descripcion: string) {
  const match = descripcion.match(/TUBO.*$/i);
  return match ? match[0] : descripcion;
}

export const terminaConNumeroYLetra = (str) => /\d[a-zA-Z]$/.test(str);