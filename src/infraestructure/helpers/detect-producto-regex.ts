// detect-producto-regex.ts

// Normaliza: mayúsculas, sin diacríticos, separa puntuación y guiones/underscores
function normalize(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[°º"'´`′″¨]/g, " ")
    .replace(/[(),:;!?]/g, " ")
    .replace(/[\/._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Reglas ORDENADAS por prioridad. La primera que haga match gana.
const RULES: Array<{
  rx: RegExp;
  product: string | ((m: RegExpExecArray) => string);
}> = [
  // Frases/bigrams más específicos
  { rx: /\bSTUB\s+END\b/i,                      product: "STUB-END" },
  { rx: /\bPORTA\s+BRIDA\b/i,                   product: "PORTABRIDA" },
  { rx: /\bTUERCA\s+UNION\b/i,                  product: "UNION" },
  { rx: /\bTAPPING\s+TEE\b/i,                   product: "TEE" },
  { rx: /\bFLOW\s+SWITCH\b/i,                   product: "SWITCH" },
  { rx: /\bABORT\s+STATION\b/i,                 product: "ABORT STATION" },
  { rx: /\bAGENT\s+RELEASE\b/i,                 product: "AGENT RELEASE" },
  { rx: /\bCOVER\s+PLATE\b/i,                   product: "CHAPETON" },

  // Snap-let / Vic-let → SALIDA
  { rx: /\bSNAP\s+LET(?:\s+SALIDA)?\b/i,        product: "SALIDA" },
  { rx: /\bVIC\s+LET\b/i,                       product: "SALIDA" },

  // OUTLET-T (a veces viene "OUTLET T RAN")
  { rx: /\bOUTLET\s+T(?:\b|\s+RAN\b)/i,         product: "OUTLET" },

  // MOD. MONITOREO → MODULO
  { rx: /\bMOD(?:\.|ULO)?\s+MONITOREO\b/i,      product: "MODULO" },

  // HID. CAMPANA / HID. ESPIGA → HIDRANTE
  { rx: /\bHID\b\.?\s+(?:CAMPANA|ESPIGA)\b/i,   product: "HIDRANTE" },

  // RAIN R (lo dejamos como RAIN por ahora)
  { rx: /\bRAIN\s+R\b/i,                        product: "RAIN" },

  // TWO-WAY HYDRANT
  { rx: /\bTWO\s+WAY\s+HYDRANT\b/i,             product: "HIDRANTE" },

  // AC + (VALV/TE/RED…)
  { rx: /\bAC\s+(VALV(?:ULA|\.)?|TE|RED(?:\.|UCCION)?)(?:\b|$)/i,
    product: (m) => {
      const g = m[1].toUpperCase();
      if (g.startsWith("VALV")) return "VALVULA";
      if (g === "TE")           return "TEE";
      return "REDUCCION"; // RED., REDUCCION, etc.
    }
  },

  // BATERIAS MCA. / BATTERY SET
  { rx: /\bBATERIAS?\s+MCA\b/i,                 product: "BATERIA" },
  { rx: /\bBATTERY\s+SET\b/i,                   product: "BATERIA" },

  // ONE LOK/LOCK → GLANDULA
  { rx: /\bONE\s+(?:LOK|LOCK)\b/i,              product: "GLANDULA" },

  // RED.* → REDUCCION (RED.BUSHING, RED.CONCENTRICA, etc.)
  { rx: /\bRED(?:\.|\s|$)[A-Z]*/i,              product: "REDUCCION" },

  // HRVALV. → VALVULA
  { rx: /\bHRVALV\b\.?/i,                       product: "VALVULA" },

  // Threadolet / Sockolet / Weldolet / Nipolet / Elbolet / Condulet
  { rx: /\bTHREADOLET\b/i,                      product: "THREDOLET" },
  { rx: /\bTHREDOLET\b/i,                       product: "THREDOLET" },
  { rx: /\bSOCKOLET\b/i,                        product: "SOCKOLET" },
  { rx: /\bWELDOLET\b/i,                        product: "WELDOLET" },
  { rx: /\bNIPOLET\b/i,                         product: "NIPOLET" },
  { rx: /\bELBOLET\b/i,                         product: "ELBOLET" },
  { rx: /\bCONDULET\b(?:\s+[CFSLT])?/i,         product: "CONDULET" },

  // Varios directos por palabra compuesta conocida
  { rx: /\bVARILLA\s+ROSCADAS?\b/i,             product: "VARILLA" },
  { rx: /\bREGULAR\s+CLEAR\b/i,                 product: "PEGAMENTO" },

  // Fallbacks potentes (prefijos / unigramas clave)
  { rx: /\bVALV(?:ULA|\.)?\b/i,                 product: "VALVULA" },
  { rx: /\bCODO\b/i,                            product: "CODO" },
  { rx: /\bTEE\b/i,                             product: "TEE" },
  { rx: /\bY\s+TIPO\b/i,                        product: "YEE" },
  { rx: /\bYEE\b/i,                             product: "YEE" },
  { rx: /\bTUB(?:O|ERIA)\b/i,                   product: "TUBO" },
  { rx: /\bBRIDA\b/i,                           product: "BRIDA" },
  { rx: /\bCOPLE\b/i,                           product: "COPLE" },
  { rx: /\bACOPLE\b/i,                          product: "COPLE" },
  { rx: /\bUNION\b/i,                           product: "UNION" },
  { rx: /\bADAPTADOR\b/i,                       product: "ADAPTADOR" },
  { rx: /\bCONECTOR\b/i,                        product: "CONECTOR" },
  { rx: /\bABRAZADERA\b/i,                      product: "ABRAZADERA" },
  { rx: /\bCURVA\b/i,                           product: "CURVA" },
  { rx: /\bCRUZ\b/i,                            product: "CRUZ" },
  { rx: /\bNIPLE\b/i,                           product: "NIPLE" },
  { rx: /\bROCIADOR\b/i,                        product: "ROCIADOR" },
  { rx: /\bCHAPETON\b/i,                        product: "CHAPETON" },
  { rx: /\bSALIDA\b/i,                          product: "SALIDA" },
  { rx: /\bHIDRANT(E)?\b/i,                     product: "HIDRANTE" },
  { rx: /\bSWAGE\b/i,                           product: "SWAGE" },
  { rx: /\bWAGE\b/i,                            product: "SWAGE" }, // typo común
  { rx: /\bOUTLET\b/i,                          product: "OUTLET" },
  { rx: /\bMANIFOLD\b/i,                        product: "MANIFOLD" },
  { rx: /\bSWITCH\b/i,                          product: "SWITCH" },
  { rx: /\bTRAMPA\b/i,                          product: "TRAMPA" },
  { rx: /\bTRIM\b/i,                            product: "TRIM" },
  { rx: /\bSIFON\b/i,                           product: "SIFON" },
  { rx: /\bSOLO?ENOID\b/i,                      product: "SOLENOID" },
  { rx: /\bWELD(?:OLET)?\b/i,                   product: "WELDOLET" },
];

// Detecta producto con regex; se detiene en la PRIMER coincidencia
export function detectProductoRegex(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const T = normalize(texto);

  for (const rule of RULES) {
    const m = rule.rx.exec(T);
    if (m) {
      return typeof rule.product === "function" ? rule.product(m) : rule.product;
    }
  }
  return null; // no hubo match
}

// Conveniencia: procesa un arreglo de descripciones
export function detectProductoRegexBatch(descripciones: Array<string | null | undefined>): (string | null)[] {
  return descripciones.map(d => detectProductoRegex(d));
}

/* ================== Ejemplos ==================
detectProductoRegex('COD. ART R01650001 TUBO DE ACERO...')                     // "TUBO"
detectProductoRegex('CODO A/INOX. T-304 DE 025 MM. (1" X 45o CED. 10)')        // "CODO"
detectProductoRegex('MOD. MONITOREO POTTER')                                   // "MODULO"
detectProductoRegex('SNAP-LET SALIDA 2"')                                      // "SALIDA"
detectProductoRegex('OUTLET-T RAN 1" NPT')                                     // "OUTLET"
detectProductoRegex('HRVALV. RISER 4"')                                        // "VALVULA"
detectProductoRegex('BATERIAS MCA.')                                           // "BATERIA"
detectProductoRegex('AC VALVULA 2"')                                           // "VALVULA"
detectProductoRegex('AC TE 3"')                                                // "TEE"
detectProductoRegex('AC REDUCCION 6X4"')                                       // "REDUCCION"
detectProductoRegex('TWO-WAY HYDRANT 4"')                                      // "HIDRANTE"
detectProductoRegex('VARILLA ROSCADA 3/8" X 3M')                                // "VARILLA"
================================================ */
