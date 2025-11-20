// detect-producto-head-only.ts

// 1) Normaliza a MAYÚSCULAS sin tildes y compacta espacios (conserva guiones)
function normalizeBasic(s: string): string {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin diacríticos
    .toUpperCase()
    .replace(/[°º"'´`′″¨,;:()!?]/g, " ")             // separadores normales
    .replace(/[._/]/g, " ")                           // separa . _ /
    .replace(/\s+/g, " ")
    .trim();
}

// 2) Quita metatokens/códigos al inicio: COD., ART., COT., SKU, etc.
function stripLeadingMeta(s: string): string {
  const META = new Set(["COD","COD.","CODIGO","CODIGO.","ART","ART.","COT","COT.","COD.ART","COD.ART."]);
  const parts = s.split(" ");
  let i = 0;
  while (i < parts.length) {
    const t = parts[i];
    // token con solo dígitos o alfanumérico tipo R92180001 ≈ código/SKU
    const isCode = /^[A-Z]*\d+[A-Z0-9]*$/.test(t);
    if (META.has(t) || isCode) { i++; continue; }
    break;
  }
  return parts.slice(i).join(" ");
}

// 3) Diccionario de PRODUCTOS (solo primera palabra). Agrega aquí los tuyos.
const PRODUCT_CANON: Record<string,string> = {
  // básicos
  "ABRAZADERA":"ABRAZADERA","ACCESORIOS":"ACCESORIOS","ACOPLAMIENTO":"ACOPLAMIENTO",
  "ACTUADOR":"ACTUADOR","AGUJA":"AGUJA","ALARMA":"ALARMA","ANCLAJE":"ANCLAJE",
  "ANGULO":"ANGULO","ANILLO":"ANILLO","APERSOR":"ASPERSOR","ASPERSOR":"ASPERSOR",
  "ARANDELA":"ARANDELA","ARCO":"ARCO","AUMENTADOR":"AUMENTADOR","BALERO":"BALERO",
  "BANDEJA":"BANDEJA","BARANDAL":"BARANDAL","BARRA":"BARRA","BASCULA":"BASCULA",
  "BASE":"BASE","BATERIA":"BATERIA","BICICLETA":"BICICLETA","BIODIGESTOR":"BIODIGESTOR",
  "BLOQUEADOR":"BLOQUEADOR","BOMBA":"BOMBA","BOQUILLA":"BOQUILLA","BOTA":"BOTA",
  "BOTAS":"BOTA","BOTE":"BOTE","BOTELLA":"BOTELLA","BOTIQUIN":"BOTIQUIN",
  "BRIDA":"BRIDA","BROCA":"BROCA","BROCAL":"BROCAL","BROCHA":"BROCHA","CABEZAL":"CABEZAL",
  "CABLE":"CABLE","CAJA":"CAJA","CALCA":"CALCA","CAMARA":"CAMARA","CAMPANA":"CAMPANA",
  "CANAL":"CANAL","CANDADO":"CANDADO","CARRETE":"CARRETE","CEMENTO":"CEMENTO",
  "CERTIFICADO":"CERTIFICADO","CHALUPA":"CHALUPA","CHAPADO":"CHAPADO","CHAVETA":"CHAVETA",
  "CHIFLON":"CHIFLON","CINCHO":"CINCHO","CINTA":"CINTA","CISTERNA":"CISTERNA",
  "CLAVO":"CLAVO","CLEAR":"LIMPIADOR","CLIP":"CLIP","CODO":"CODO","COLA":"COLA COCHINO",
  "COLADERA":"COLADERA","COLECTOR":"COLECTOR","COLGADOR":"COLGADOR","COLGANTE":"COLGANTE",
  "COMPRESSOR":"COMPRESOR","CONDULET":"CONDULET","CONDULETS":"CONDULET","CONECTOR":"CONECTOR",
  "CONTACTO":"CONTACTO","CONTRABRIDA":"CONTRABRIDA","COPLE":"COPLE","CORTE":"CORTE",
  "CUADRO":"CUADRO","CUBETA":"CUBETA","CUELLO":"CUELLO","CUERDA":"CUERDA","CUÑA":"CUÑA",
  "DADO":"DADO","DETECTOR":"DETECTOR","DIAFRAGMA":"DIAFRAGMA","DIFUSOR":"DIFUSOR",
  "DISCO":"DISCO","ELECTRODO":"ELECTRODO","EMISOR":"EMISOR","EMPAQUE":"EMPAQUE",
  "ENSAMBLE":"ENSAMBLE","ENTRADA":"ENTRADA","EQUIPO":"EQUIPO","ESCALON":"ESCALON",
  "ESPARRAGO":"ESPARRAGO","ESPATULA":"ESPATULA","ESTACION":"ESTACION","ESTACIONES":"ESTACION",
  "ESTROBO":"ESTROBO","ETIQUETA":"ETIQUETA","FERULA":"FERULA","FIBRA":"FIBRA",
  "FILTRO":"FILTRO","FLOTADOR":"FLOTADOR","FUENTE":"FUENTE","GABINETE":"GABINETE",
  "GLAND":"GLAND","GLANDULA":"GLANDULA","GRANADA":"GRANADA","GRAPA":"GRAPA",
  "GRASA":"GRASA","GUANTE":"GUANTE","HIDRANTE":"HIDRANTE","HIERRO":"HIERRO",
  "HILO":"HILO","HOJA":"HOJA","IMPERMEABLE":"IMPERMEABLE","IMPULSOR":"IMPULSOR",
  "INSERTO":"INSERTO","INTERRUPTOR":"INTERRUPTOR","JUEGO":"JUEGO","JUNTA":"JUNTA",
  "KIT":"KIT","LAMINA":"LAMINA","LAMPARA":"LAMPARA","LATERAL":"LATERAL","LIJA":"LIJA",
  "LIMA":"LIMA","LIMPIADOR":"LIMPIADOR","LIQUIDO":"LIQUIDO","LLAVE":"LLAVE",
  "MALETA":"MALETA","MAQUINA":"MAQUINA","MANIFOLD":"MANIFOLD","MANOMETRO":"MANOMETRO",
  "MATRICES":"MATRICES","MEDIDOR":"MEDIDOR","MESA":"MESA","MEZCLADOR":"MEZCLADOR",
  "MINIMODULO":"MODULO","MIRILLA":"MIRILLA","MODULO":"MODULO","MONTURA":"MONTURA",
  "MORDAZA":"MORDAZA","MOTOBOMBA":"MOTOBOMBA","MOTOR":"MOTOR","NIPLE":"NIPLE",
  "NOZZLE":"BOQUILLA","PALA":"PALA","PALETA":"PALETA","PANEL":"PANEL","PARED":"TUBO",
  "PEGAMENTO":"PEGAMENTO","PERFIL":"PERFIL","PERNO":"PERNO","PIJA":"PIJA","PIPE":"FLOTADOR",
  "PISTOLA":"PISTOLA","PLACA":"PLACA","PLATO":"PLATO","PLAYERA":"PLAYERA","POINT":"SISTEMA",
  "PORTA":"PORTA","PORTABRIDAS":"PORTABRIDA","PORTABRIDA":"PORTABRIDA",
  "PORTATIL":"EXTINTOR","POSTE":"POSTE","PPRC":"PPRC","PQS":"EXTINTOR","PRESOSTATO":"PRESOSTATO",
  "PRIMER":"PRIMER","RACK":"RACK","RASTRILLO":"RASTRILLO","RED":"REDUCCION","REGISTRO":"REGISTRO",
  "RELEASING":"MODULO","RESISTENCIA":"RESISTENCIA","REST":"RESTRICTOR","RESTRICTOR":"RESTRICTOR",
  "RODILLO":"RODILLO","ROLDANA":"ROLDANA","ROLLO":"ROLLO","ROTOR":"ROTOR","RUEDA":"RUEDA",
  "SALVATUBOS":"SALVATUBOS","SEGUETA":"SEGUETA","SELLADOR":"SELLADOR","SELLO":"SELLO",
  "SEÑAL":"SEÑAL","SENAL":"SEÑAL","SEPARADOR":"SEPARADOR","SET":"SET","SILICON":"SILICON",
  "SIRENA":"SIRENA","SISTEMA":"SISTEMA","SOLDADURA":"SOLDADURA","SOLERA":"SOLERA",
  "SOLVENTE":"SOLVENTE","SOMBRERO":"SOMBRERO","SOPORTE":"SOPORTE","SRFC":"SOPORTE",
  "STANDARD":"STANDARD","STUB":"STUB-END","SUAJE":"SUAJE","SUBMERS":"SUBMERS","TABLERO":"TABLERO",
  "TANQUE":"TANQUE","TAPA":"TAPA","TAPON":"TAPON","TAQUETE":"TAQUETE","TE":"TEE","TEE":"TEE",
  "TELA":"TELA","TERMINAL":"TERMINAL","TERMOMETRO":"TERMOMETRO","TERMOPOZO":"TERMOPOZO",
  "TERMOSTATO":"TERMOSTATO","TERRAJA":"TERRAJA","TIJERAS":"TIJERAS","TINACO":"TINACO",
  "TOBERA":"TOBERA","TOMA":"TOMA","TORNILLO":"TORNILLO","TRAMO":"TRAMO","TUBERIA":"TUBO",
  "TUBO":"TUBO","TUERCA":"TUERCA","UNICANAL":"UNICANAL","UNION":"UNION","VAL":"VALVULA",
  "VALV":"VALVULA","VALVULA":"VALVULA","VIC":"LUBRICANTE","VIDRIO":"VIDRIO","VIGA":"VIGA",
  "WHITE":"WHITE","Y":"YEE","YE":"YEE","YEE":"YEE",
  // extras comunes que pediste
  "OUTLET":"OUTLET","SNAP-LET":"SALIDA","VIC-LET":"SALIDA","RAIN":"RAIN",
  "THREDOLET":"THREDOLET","THREADOLET":"THREDOLET","SOCKOLET":"SOCKOLET","WELDOLET":"WELDOLET",
  "NIPOLET":"NIPOLET","ELBOLET":"ELBOLET"
};

// 4) Palabras NO producto que a veces aparecen primero (materiales, medidas, etc.)
const NOT_PRODUCT = new Set([
  "ACERO","PVC","CPVC","PPR","HDPE","PPH","PLASTICO","HIERRO","BRONCE","AC","AL",
  "STD","MM","MM.","KG","KGS","LBS","MCA","WPB","SW","NC","NPT"
]);

export function detectProductoHeadOnly(texto: string | null | undefined): string | null {
  if (!texto) return null;

  // normaliza y limpia el encabezado (COD./ART./SKUs)
  let T = normalizeBasic(texto);
  T = stripLeadingMeta(T);
  if (!T) return null;

  // toma la PRIMERA palabra (conservando guiones)
  const firstSpace = T.indexOf(" ");
  let head = (firstSpace === -1 ? T : T.slice(0, firstSpace)).replace(/\.$/, "");

  // si es metatoken de medida/material, intenta usar la 2a palabra
  // if (NOT_PRODUCT.has(head)) {
  //   const rest = T.slice(firstSpace + 1).trim();
  //   if (!rest) return null;
  //   const sp2 = rest.indexOf(" ");
  //   head = (sp2 === -1 ? rest : rest.slice(0, sp2)).replace(/\.$/, "");
  // }

  // normaliza atajos típicos de producto en 1a posición
  if (head === "VAL" || head === "VALV" || head === "VALV.") head = "VALVULA";
  if (head === "TE") head = "TEE";
  if (head === "YE" || head === "Y") head = "YEE";
  if (head === "TUBERIA") head = "TUBO";
  if (head === "SNAP" && T.startsWith("SNAP-LET")) head = "SNAP-LET";
  if (head === "VIC" && T.startsWith("VIC-LET")) head = "VIC-LET";
  if (head === "STUB" && /\bSTUB[-\s]+END\b/.test(T)) head = "STUB-END";
  if (head === "NOZZLE") head = "NOZZLE"; // se mapeará a BOQUILLA

  // mapea a canónico si existe
  const canon = PRODUCT_CANON[head];
  if (canon) return canon;

  // Fallback: si la 1a palabra tiene punto final (VALV., MOD., etc.)
  const headNoDot = head.replace(/\.$/, "");
  if (PRODUCT_CANON[headNoDot]) return PRODUCT_CANON[headNoDot];

  // Si de plano no está en el diccionario, devolvemos null (no producto conocido)
  return null;
}
