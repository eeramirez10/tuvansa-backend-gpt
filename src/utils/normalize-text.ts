

export function normalizarTubo(texto: string) {
  return texto.replace(/\btubos\b/gi, 'tubo');
}

export function extraerDesdeTubo(descripcion: string) {
  const match = descripcion.match(/TUBO.*$/i);
  return match ? match[0] : descripcion;
}

export const terminaConNumeroYLetra = (str) => /\d[a-zA-Z]$/.test(str);





// detect-producto.ts
// ---------------------------------------------
// Detecta el PRODUCTO a partir de una descripción completa.
// Prioridad: (1) frases (bigrams) en cualquier parte del texto
//            (2) tokens sueltos (unigramas) en todo el texto
// Devuelve el nombre del producto normalizado o null.
// ---------------------------------------------


// ---------------------------------------------
// (Opcional) Ejemplo de uso
// ---------------------------------------------
// console.log(detectProducto('CODO 45° PVC DWV (CAMP X CAMP) DE 2"'));
// → "CODO"
// console.log(detectProducto('PORTA BRIDA PPH 4" DN150'));
// → "PORTABRIDA"
// console.log(detectProducto('VALV.CHECK ACERO 2"'));
// → "VALVULA"
// console.log(detectProducto('JUNTA DE EXPANSION 6"'));
// → "JUNTA"
// console.log(detectProducto('PVC TUBERIA SANITARIA 4"')));
// → "TUBO"


// detect-producto.ts
// ---------------------------------------------
// Detecta el PRODUCTO a partir de una descripción completa.
// Prioridad: (1) frases (bigrams) en cualquier parte del texto
//            (2) tokens sueltos (unigramas) en todo el texto
// Devuelve el nombre del producto normalizado o null.
// ---------------------------------------------

// export function detectProducto(texto: string | null | undefined): string | null {
//   if (!texto) return null;

//   // --- normalización global ---
//   const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
//   let T = strip(String(texto)).toUpperCase();
//   T = T
//     .replace(/[°º"'´`′″¨×.]/g, " ")  // punto incluido (ej: VALV.CHECK)
//     .replace(/[(),:;!?]/g, " ")
//     .replace(/\//g, " ")
//     .replace(/-/g, " ")              // 'STUB-END' -> 'STUB END'
//     .replace(/\s+/g, " ")
//     .trim();

//   if (!T) return null;

//   // --- tokenización completa ---
//   const rawTokens = T.split(" ");

//   // --- sets útiles ---
//   const MATERIALS = new Set([
//     "CPVC","PVC","PPR","PPH","HDPE","PEAD","ACERO","PLASTICO","POLIPROPILENO","POLIETILENO","PPRC"
//   ]);
//   const STOP = new Set([
//     "DE","PARA","CON","CED","CED.","TIPO","UNI","UNI.","FIG","FIG.","DN",
//     "MM","MM.","MOD","MOD.","MCA","MCA.","HID","HID."
//   ]);

//   // --- normaliza token por token / abreviaturas ---
//   const normWord = (w: string) => {
//     if (!w) return w;
//     if (w === "VALV" || w === "VALV.") return "VALVULA";
//     if (w === "RED"  || w === "RED.")  return "REDUCCION";
//     if (w === "REST" || w === "REST.") return "RESTRICTOR";
//     if (w === "TE") return "TEE";
//     if (w === "YE" || w === "YEE") return "YEE";
//     if (w === "TUBERIA") return "TUBO";
//     if (w === "STUBEND" || w === "STUB-END") return "STUB"; // se re-arma como bigrama STUB END
//     if (w === "PORTBR") return "PORTA";                     // idem: PORTA BRIDA
//     if (w === "ACC" || w === "ACC.") return "ACCESORIO";
//     if (w === "APERSOR") return "ASPERSOR";
//     if (w === "VALV.") return "VALVULA";
//     if (w === "BOTAS") return "BOTA";
//     if (w === "CPV") return "CPVC";
//     if (w === "PP-H") return "PPH";
//     return w;
//   };
//   const tokens = rawTokens.map(normWord);

//   const isNoise = (w: string) => !w || /\d/.test(w) || w.includes("X");

//   // --- 1) DETECCIÓN DE FRASES (bigrams) EN TODO EL TEXTO ---
//   for (let i = 0; i < tokens.length - 1; i++) {
//     const a = tokens[i];
//     const b = tokens[i + 1];
//     if (!a || !b) continue;

//     // Reglas de frases
//     if (a === "STUB"     && b === "END")       return "STUB-END";
//     if (a === "PORTA"    && b === "BRIDA")     return "PORTABRIDA";
//     if (a === "TUERCA"   && b === "UNION")     return "UNION";
//     if (a === "Y"        && b === "TIPO")      return "YEE";
//     if (a === "MJ"       && b === "TUBO")      return "TUBO";
//     if (a === "JUNTA"    && b === "EXPANSION") return "JUNTA";
//     if (a === "SWAGE"    && b === "NIPLE")     return "NIPLE";
//     if (a === "ABORT"    && b === "STATION")   return "ABORT STATION";
//     if (a === "AGENT"    && b === "RELEASE")   return "AGENT RELEASE";
//     if (a === "PORTATIL" && ["AGUA","CO2","POLVO","QUIMICO","ESPUMA","PQS","ABC"].includes(b)) return "EXTINTOR";
//     if (a === "GABINETE" && ["CONTRA","MANGUERA","FUEGO"].includes(b))                         return "GABINETE";
//     // Material + TUBO (en cualquier parte)
//     if (MATERIALS.has(a) && b === "TUBO")      return "TUBO";
//   }

//   // --- 2) DETECCIÓN DE UNIGRAMAS EN TODO EL TEXTO ---
//   for (const tk of tokens) {
//     if (!tk) continue;
//     if (isNoise(tk) || MATERIALS.has(tk) || STOP.has(tk)) continue;

//     // Prefijos especiales
//     if (tk.startsWith("VALV")) return "VALVULA";

//     if (PRODUCT_MAP[tk]) return PRODUCT_MAP[tk];
//   }

//   // Nada detectado
//   return null;
// }


// detect-producto-simple.ts
// Busca el PRODUCTO en todo el texto (simple):
// - omite solo: "DE", "CON", "X"
// - primero bigramas (frases), luego unigrama (palabra)
// - devuelve el nombre normalizado del producto o null

// export function detectProducto(texto: string | null | undefined): string | null {
//   if (!texto) return null;

//   // Normaliza: mayúsculas, sin tildes y separa puntuación en espacios
//   const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
//   let T = strip(String(texto)).toUpperCase()
//     .replace(/[°º"'´`′″¨×.]/g, " ")
//     .replace(/[(),:;!?]/g, " ")
//     .replace(/\//g, " ")
//     .replace(/-/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();

//   if (!T) return null;

//   // Stopwords mínimas que querías omitir
//   const STOP = new Set(["DE", "CON", "X"]);

//   // Normaliza token por token
//   const normWord = (w: string) => {
//     if (!w) return w;
//     if (w === "VALV" || w === "VALV.") return "VALVULA";
//     if (w === "RED"  || w === "RED.")  return "REDUCCION";
//     if (w === "REST" || w === "REST.") return "RESTRICTOR";
//     if (w === "TE") return "TEE";
//     if (w === "YE" || w === "YEE") return "YEE";
//     if (w === "TUBERIA") return "TUBO";
//     if (w === "STUBEND" || w === "STUB-END") return "STUB"; // se armará como "STUB END"
//     if (w === "PORTBR") return "PORTA";                     // "PORTA BRIDA"
//     if (w === "APERSOR") return "ASPERSOR";
//     if (w === "VALV.") return "VALVULA";
//     return w;
//   };

//   const tokens = T.split(" ")
//     .map(normWord)
//     .filter(t => t && !STOP.has(t)); // << solo omite DE, CON, X

//   if (tokens.length === 0) return null;

//   // 1) Frases clave (bigrams) fáciles y comunes
//   //    Recorre toda la descripción
//   for (let i = 0; i < tokens.length - 1; i++) {
//     const a = tokens[i], b = tokens[i + 1];

//     if (a === "STUB"     && b === "END")    return "STUB-END";
//     if (a === "PORTA"    && b === "BRIDA")  return "PORTABRIDA";
//     if (a === "TUERCA"   && b === "UNION")  return "UNION";
//     if (a === "Y"        && b === "TIPO")   return "YEE";
//     if (a === "MJ"       && (b === "TUBO")) return "TUBO";
//     if (a === "ABORT"    && b === "STATION")return "ABORT STATION";
//     if (a === "AGENT"    && b === "RELEASE")return "AGENT RELEASE";
//   }

//   // 2) Palabras clave (unigramas) — primer match gana (izq→der)
//   for (const tk of tokens) {
//     // casos de prefijo
//     if (tk.startsWith("VALV")) return "VALVULA";

//     if (PRODUCTS.has(tk)) return CANON[tk] ?? tk;
//   }

//   return null;
// }

// --- catálogo mínimo de productos y sinónimos ---
// Puedes agregar/quitar sin romper la función simple

// const CANON: Record<string, string> = {
//   "ACOPLE": "COPLE",
//   "VALVULA": "VALVULA",
// };

// const PRODUCTS = new Set<string>([
//   // familias core
//   "CODO","VALVULA","TEE","YEE","TUBO","BRIDA","COPLE","UNION","ADAPTADOR",
//   "CONECTOR","ABRAZADERA","CURVA","CRUZ","NIPLE","MANGUERA","MANGUITO",
//   "RESTRICTOR","REDUCCION","TAPON","TAPA","ROCIADOR","LATROLET","GLANDULA",
//   "LLAVE","PEGAMENTO","CEMENTO","PRIMER","LIMPIADOR","BROCHA","CAJA",
//   "REGISTRO","SALVATUBOS","EMPAQUE","FLOTADOR","SILICON","TIJERAS","KIT",
//   "JUEGO","MAQUINA","MATRICES","MONTURA","CONTRABRIDA","COLADERA",
//   "PORTABRIDA","STUB-END","ASPERSOR","ACOPLAMIENTO","ACCESORIO","ACTUADOR",
//   "ANCLAJE","ANGULO","ANILLO","ARANDELA","ARCO","AUMENTADOR","BALERO",
//   "BANDEJA","BARANDAL","BARRA","BASCULA","BASE","BATERIA","BOMBA","BOQUILLA",
//   "BOTA","BOTE","BOTELLA","BOTIQUIN","SOPORTE","JUNTA","MANOMETRO",
//   "GABINETE","TUERCA","HIDRANTE","TAQUETE","DETECTOR","TORNILLO","ESPARRAGO",
//   "SELLADOR","CARRETE","CINTA","EQUIPO","FILTRO","TANQUE","TERMOMETRO",
//   "CINCHO","COLGADOR","CONTACTO","GLAND","GUANTE","INSERTO","MOTOBOMBA",
//   "MOTOR","EXTINTOR","ABORT","AGENT","STATION","RELEASE","PORTA","END","MJ" // partes de frases
// ]);

/* ------------- ejemplos rápidos -------------
detectProducto('CODO A/INOX. T-304 DE 025 MM. (1" X 45o CED. 10)') // => 'CODO'
detectProducto('COD. ART R01650001 TUBO DE ACERO...')              // => 'TUBO'
detectProducto('PORTA BRIDA PPH 4"')                               // => 'PORTABRIDA'
detectProducto('VALV.CHECK ACERO 2"')                              // => 'VALVULA'
------------------------------------------------ */



// Diccionario de productos (unigramas)
// const PRODUCT_MAP: Record<string, string> = {
//   // familias core
//   "CODO":"CODO","VALVULA":"VALVULA","TEE":"TEE","YEE":"YEE","TUBO":"TUBO","BRIDA":"BRIDA",
//   "COPLE":"COPLE","UNION":"UNION","ADAPTADOR":"ADAPTADOR","CONECTOR":"CONECTOR","ABRAZADERA":"ABRAZADERA",
//   "CURVA":"CURVA","CRUZ":"CRUZ","NIPLE":"NIPLE","MANGUERA":"MANGUERA","MANGUITO":"MANGUITO",
//   "RESTRICTOR":"RESTRICTOR","REDUCCION":"REDUCCION","TAPON":"TAPON","TAPA":"TAPA","ROCIADOR":"ROCIADOR",
//   "LATROLET":"LATROLET","GLANDULA":"GLANDULA","LLAVE":"LLAVE","PEGAMENTO":"PEGAMENTO","CEMENTO":"CEMENTO",
//   "PRIMER":"PRIMER","LIMPIADOR":"LIMPIADOR","BROCHA":"BROCHA","CAJA":"CAJA","REGISTRO":"REGISTRO",
//   "SALVATUBOS":"SALVATUBOS","EMPAQUE":"EMPAQUE","FLOTADOR":"FLOTADOR","SILICON":"SILICON","TIJERAS":"TIJERAS",
//   "KIT":"KIT","JUEGO":"JUEGO","MAQUINA":"MAQUINA","MATRICES":"MATRICES","MONTURA":"MONTURA","CONTRABRIDA":"CONTRABRIDA",
//   "COLADERA":"COLADERA","PORTABRIDA":"PORTABRIDA","STUB-END":"STUB-END","ASPERSOR":"ASPERSOR",

//   // otras familias de tu set
//   "ACOPLAMIENTO":"ACOPLAMIENTO","ACCESORIO":"ACCESORIO","ACTUADOR":"ACTUADOR","ANCLAJE":"ANCLAJE","ANGULO":"ANGULO",
//   "ANILLO":"ANILLO","ARANDELA":"ARANDELA","ARCO":"ARCO","AUMENTADOR":"AUMENTADOR","BALERO":"BALERO","BANDEJA":"BANDEJA",
//   "BARANDAL":"BARANDAL","BARRA":"BARRA","BASCULA":"BASCULA","BASE":"BASE","BATERIA":"BATERIA","BICICLETA":"BICICLETA",
//   "BIODIGESTOR":"BIODIGESTOR","BLOQUEADOR":"BLOQUEADOR","BOMBA":"BOMBA","BOQUILLA":"BOQUILLA","BOTA":"BOTA","BOTE":"BOTE",
//   "BOTELLA":"BOTELLA","BOTIQUIN":"BOTIQUIN","SOPORTE":"SOPORTE",

//   // agregados nuevos por tus datos
//   "JUNTA":"JUNTA","MANOMETRO":"MANOMETRO","GABINETE":"GABINETE","TUERCA":"TUERCA","HIDRANTE":"HIDRANTE",
//   "TAQUETE":"TAQUETE","DETECTOR":"DETECTOR","TORNILLO":"TORNILLO","ESPARRAGO":"ESPARRAGO","SELLADOR":"SELLADOR",
//   "CARRETE":"CARRETE","CINTA":"CINTA","EQUIPO":"EQUIPO","FILTRO":"FILTRO","TANQUE":"TANQUE","TERMOMETRO":"TERMOMETRO",
//   "CINCHO":"CINCHO","COLGADOR":"COLGADOR","CONTACTO":"CONTACTO","GLAND":"GLANDULA","GUANTE":"GUANTE","INSERTO":"INSERTO",
//   "MOTOBOMBA":"BOMBA","MOTOR":"MOTOR","EXTINTOR":"EXTINTOR",

//   // frases que también tratamos como unigramas “etiquetados”
//   "ABORT STATION":"ABORT STATION",
//   "AGENT RELEASE":"AGENT RELEASE"
// };

// ---------------------------------------------
// (Opcional) Ejemplo de uso
// ---------------------------------------------
// console.log(detectProducto('CODO 45° PVC DWV (CAMP X CAMP) DE 2"'));
// → "CODO"
// console.log(detectProducto('PORTA BRIDA PPH 4" DN150'));
// → "PORTABRIDA"
// console.log(detectProducto('VALV.CHECK ACERO 2"'));
// → "VALVULA"
// console.log(detectProducto('JUNTA DE EXPANSION 6"'));
// → "JUNTA"
// console.log(detectProducto('PVC TUBERIA SANITARIA 4"')));
// → "TUBO"



// detect-producto-simple-extendido.ts
// - Omite solo: "DE", "CON", "X"
// - Busca primero FRASES (bigrams) en todo el texto; si no hay, busca PALABRAS (unigramas)
// - Devuelve el PRODUCTO (normalizado) o null

// detect-producto-simple-extendido.ts
// Busca el PRODUCTO en TODO el texto.
// Omite solo: "DE", "CON", "X" + metatokens como COD/ART/COT.
// Prioridad: (1) frases/bigrams (en todo el texto) -> (2) palabras (unigramas).
// Devuelve el nombre de producto normalizado o null.

export function detectProducto(texto: string | null | undefined): string | null {
  if (!texto) return null;

  // --- normalización global ---
  const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let T = strip(String(texto)).toUpperCase()
    .replace(/[°º"'´`′″¨×.]/g, " ")   // separa VALV.CHECK, MOD., etc.
    .replace(/[(),:;!?]/g, " ")
    .replace(/[\/_-]/g, " ")          // OUTLET-T, V_SEN, VIC-LET, SNAP-LET
    .replace(/\s+/g, " ")
    .trim();

  if (!T) return null;

  // Omite solo estos (más metatokens frecuentes que no son producto)
  const STOP = new Set(["DE","CON","X","COD","COD.","ART","ART.","COT","COT."]);

  // Normaliza token por token (abreviaturas/sinónimos)
  const normWord = (w: string) => {
    if (!w) return w;
    if (w === "VALV" || w === "VALV.") return "VALVULA";
    if (w === "VAL"  || w === "VAL.")  return "VALVULA";
    if (w === "RED"  || w === "RED.")  return "REDUCCION";
    if (w === "REST" || w === "REST.") return "RESTRICTOR";
    if (w === "TE") return "TEE";
    if (w === "YE") return "YEE";
    if (w === "TUBERIA") return "TUBO";
    if (w === "STUBEND" || w === "STUB-END") return "STUB"; // se arma como "STUB END"
    if (w === "PORTBR") return "PORTA";                     // "PORTA BRIDA"
    if (w === "APERSOR") return "ASPERSOR";
    if (w === "CONDULETS") return "CONDULET";
    if (w === "THREDOLET" || w === "THREADOLET") return "THREDOLET";
    if (w === "ACOPLE") return "COPLE";
    if (w === "MILTICONDUCTOR") return "MULTICONDUCTOR";    // typo frecuente
    if (w === "HRVALV") return "VALVULA";
    if (w === "SENAL") return "SEÑAL";                      // por si no quitas diacríticos
    if (w === "TUPOPLUS") return "TUBOPLUS";
    if (w === "MCA") return "MCA"; // maneja BATERIAS MCA (sin punto)
    return w;
  };

  const tokens = T.split(" ")
    .map(normWord)
    .filter(t => t && !STOP.has(t));

  if (tokens.length === 0) return null;

  // utilitario: ¿es producto?
  const isProd = (p: string) => PRODUCTS.has(p) || CANON[p] !== undefined;

  // --- 1) FRASES (bigrams) en cualquier parte ---
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];

    // Genéricas y previas
    if (a === "STUB"      && b === "END")        return "STUB-END";
    if (a === "PORTA"     && b === "BRIDA")      return "PORTABRIDA";
    if (a === "TUERCA"    && b === "UNION")      return "UNION";
    if (a === "Y"         && b === "TIPO")       return "YEE";
    if (a === "MJ"        && b === "TUBO")       return "TUBO";
    if (a === "SWAGE"     && b === "NIPLE")      return "NIPLE";
    if (a === "ABORT"     && b === "STATION")    return "ABORT STATION";
    if (a === "AGENT"     && b === "RELEASE")    return "AGENT RELEASE";
    if (a === "FLOW"      && b === "SWITCH")     return "SWITCH";
    if (a === "COVER"     && b === "PLATE")      return "CHAPETON";

    // *** NUEVAS REGLAS que pediste ***
    // AC [producto]  (AC REDUCCION / AC TE / AC VALVULA)
    if (a === "AC" && isProd(b))                 return CANON[b] ?? b;

    // ACC. GIRATORIO
    if (a === "ACCESORIO" && b === "GIRATORIO")  return "ACCESORIO";

    // BATERIAS MCA. / BATTERY SET
    if (a === "BATERIAS" && b === "MCA")         return "BATERIA";
    if (a === "BATTERY"  && b === "SET")         return "BATERIA";

    // HID. CAMPANA / HID. ESPIGA  -> HIDRANTE
    if ((a === "HID" || a === "HIDRANTE") && (b === "CAMPANA" || b === "ESPIGA")) return "HIDRANTE";

    // MOD. MONITOREO -> MODULO
    if ((a === "MOD" || a === "MODULO" || a === "MOD.") && b === "MONITOREO") return "MODULO";

    // OUTLET-T RAN  (tras normalizar: OUTLET T RAN)
    if (a === "OUTLET" && (b === "T" || b === "RAN")) return "OUTLET";

    // RAIN R
    if (a === "RAIN" && b === "R")               return "RAIN";

    // RED.xxx  -> REDUCCION
    if (a === "REDUCCION")                       return "REDUCCION";
    if (a === "RED" || a.startsWith("RED"))      return "REDUCCION";

    // REGULAR CLEAR (pegamentos)
    if (a === "REGULAR" && b === "CLEAR")        return "PEGAMENTO";

    // SALIDA VIC-LET  / SNAP-LET SALIDA
    if (a === "SNAP" && b === "LET")             return "SALIDA";
    if (a === "VIC"  && b === "LET")             return "SALIDA";

    // SEÑAL MODELO
    if ((a === "SEÑAL" || a === "SENAL") && b === "MODELO") return "SEÑAL";
  }

  // --- 2) UNIGRAMAS (izq→der; primera coincidencia gana) ---
  for (const tk of tokens) {
    // Variantes útiles
    if (tk.includes("VALV"))                     return "VALVULA";  // HRVALV, VALV, etc.
    if (tk.startsWith("RED"))                    return "REDUCCION";
    if (tk === "HYDRANT")                        return "HIDRANTE"; // TWO-WAY HYDRANT
    if (tk === "OUTLET")                         return "OUTLET";
    if (tk === "RAIN")                           return "RAIN";
    if (tk === "VARILLA" || tk === "VARILLAS")   return "VARILLA";
    if (tk === "WAGE")                           return "SWAGE";     // SWAGE cortado
    if (tk === "TUBOPLUS")                       return "TUBO";
    if (tk === "SNAPLET" || tk === "VICLET")     return "SALIDA";    // por si llega junto

    if (PRODUCTS.has(tk))                        return CANON[tk] ?? tk;
  }

  // --- 3) Fallback regex MUY simple ---
  if (/\bROCIADOR\b/.test(T)) return "ROCIADOR";
  if (/\bCODO\b/.test(T))     return "CODO";
  if (/\bTUBO\b|\bTUBERIA\b/.test(T)) return "TUBO";
  if (/\bSALIDA\b/.test(T))   return "SALIDA";

  return null;
}

// Sinónimos → forma canónica
const CANON: Record<string,string> = {
  "ACOPLE":"COPLE",
  "CONDULETS":"CONDULET",
  "THREDOLET":"THREDOLET",
  "THREADOLET":"THREDOLET",
  "BATTERY":"BATERIA",
};

// Catálogo de productos (unigramas REALES — sin metatokens)
const PRODUCTS = new Set<string>([
  // Core
  "CODO","VALVULA","TEE","YEE","TUBO","BRIDA","COPLE","UNION","ADAPTADOR","CONECTOR",
  "ABRAZADERA","CURVA","CIEGA","COLA","CRUZ","NIPLE","MANGUERA","MANGUITO","RESTRICTOR","REDUCCION",
  "TAPON","TAPA","ROCIADOR","LATROLET","GLANDULA","LLAVE","PEGAMENTO","CEMENTO","PRIMER",
  "LIMPIADOR","BROCHA","CAJA","REGISTRO","SALIDA","EMPAQUE","FLOTADOR","SILICON","TIJERAS",
  "KIT","JUEGO","MAQUINA","MATRICES","MONTURA","CONTRABRIDA","COLADERA","PORTABRIDA",
  "STUB-END","ASPERSOR","ACOPLAMIENTO","ACCESORIO","ACTUADOR","ANCLAJE","ANGULO","ANILLO",
  "ARANDELA","ARCO","AUMENTADOR","BALERO","BANDEJA","BARANDAL","BARRA","BASCULA","BASE",
  "BATERIA","BOMBA","BOQUILLA","BOTA","BOTE","BOTELLA","BOTIQUIN","SOPORTE","JUNTA",
  "MANOMETRO","GABINETE","TUERCA","HIDRANTE","TAQUETE","DETECTOR","TORNILLO","ESPARRAGO",
  "SELLADOR","CARRETE","CINTA","EQUIPO","FILTRO","TANQUE","TERMOMETRO","CINCHO","COLGADOR",
  "CONTACTO","GLAND","GUANTE","INSERTO","MOTOBOMBA","MOTOR","EXTINTOR","CHAPETON","BROCAL",
  "CABEZAL","CABLE","CALCA","CAMARA","CAMPANA","CANAL","CANDADO","CARRETILLA","CEDAZO",
  "CERTIFICADO","CHALUPA","CHAPADO","CHAVETA","CHIFLON","CISTERNA","CLAVIJA","CLAVO","CLIP",
  "COLECTOR","COLGANTE","COMPRESOR","CONDULET","CONJUNTO","CONVERSION","CORTE","CUADRO",
  "CUBETA","CUELLO","CUERDA","CUÑA","DADO","DIAFRAGMA","DIFUSOR","DISCO","ECO","ELBOLET",
  "ELECTRODO","EMISOR","ENSAMBLE","ENTRADA","ESCALON","ESPATULA","ESTACION","ESTROBO",
  "ETIQUETA","FERULA","FIBRA","FORJA","FUENTE","GARRA","GRANADA","GRAPA","GRASA","GUARDA",
  "HIERRO","HILO","HOJA","IMPERMEABLE","IMPULSOR","INTERRUPTOR","JUNTAS","KIT","KOIL",
  "LAMINA","LAMPARA","LATA","LATERAL","LIJA","LIMA","LINER","LIQUIDO","LOCAL","LOTE",
  "LUBRICANTE","MACHETE","MALETA","MANIFOLD","VACUOMETRO","MANOVACUOMETRO","MEDIDOR","MESA",
  "MEZCLADOR","MODULO","MONITOR","MORDAZA","MUESTRA","NIPOLET","NOZZLE","OPERADOR","OPTICAL",
  "OUTLET","PALA","PALETA","PANEL","PARED","PERFIL","PERNO","PIJA","PIPE","PISTOLA","PLACA",
  "PLATO","PLAYERA","SISTEMA","POLVO","POSTE","PPRC","PQS","PRESOSTATO","RACK","RANURADORA",
  "RASTRILLO","REGULADOR","REPUESTO","RESISTENCIA","RETENCION","RODILLO","ROLDANA","ROLLO",
  "ROTOR","RUEDA","SEGUETA","SEGURO","SELLO","SEÑAL","SEPARADOR","SET","SIFON","SILLETA",
  "SIRENA","SNAPLET","VICLET","SOCKOLET","SOLDADURA","SOLENOID","SOLERA","SOLVENTE","SOMBRERO",
  "SUAJE","SWAGE","SWITCH","TABLERO","TAPPING","TARJETA","TELA","TERMINAL","TERMO","TERMOPOZO",
  "TERMOSTATO","TERRAJA","THINNER","THREDOLET","TINACO","TOBERA","TOMA","TRAMO","TRAMPA","TRIM",
  "TTEE","TUBING","UNICANAL","UNIVERSAL","VIDRIO","VIGA","VOLANTE","WELDOLET","RAIN","OUTLET"
]);
