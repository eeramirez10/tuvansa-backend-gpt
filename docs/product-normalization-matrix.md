# Product Normalization Matrix

## Objetivo

Definir como interpretar `description`, `IEAN` y `FAM2/FAM3/FAM4/FAM5/FAM7/FAM8/FAMC`
segun el tipo de producto detectado. Esta matriz evita asumir que una misma familia
siempre significa lo mismo en todo el ERP.

Scope obligatorio del catalogo fuente:

- `MID(ICOD, 1, 2) = '01'`

## Principios

1. Primero se detecta el `bucket`.
2. Despues se interpreta cada `FAM` segun ese `bucket`.
3. Si el ERP no es confiable o viene vacio, se usa `source_description` como fallback.
4. Los valores originales del ERP se conservan como `raw_*`.
5. La web y Pinecone solo deben usar campos `normalized_*`.

## Orden de deteccion

1. `EAN signal`
2. `Description signal`
3. `Material signal`
4. `First word / text normalization`

## Buckets actuales

- `VALVULA`
- `TUBO_ACERO`
- `TUBO_PLASTICO`
- `CODO`
- `BRIDA`
- `GENERAL`

## Campos normalizados objetivo

- `product`
- `category`
- `subcategory`
- `material`
- `diameter`
- `ced`
- `costura`
- `termino`
- `acabado`
- `subtipo`
- `tipo`
- `radio`
- `angulo`
- `presion`
- `grado`
- `figura`
- `originalDescription`
- `normalizedDescription`

## Matriz por bucket

### `VALVULA`

Categoria corta:

- `category = VALVULAS`

Interpretacion principal:

- `product = VALVULA`
- `subcategory = subtipo`
- `material <- FAM4`
- `diameter <- FAM8`
- `ced <- FAM7` cuando venga como `STD`, `40`, `80`, `XS`
- `termino <- FAM5`
- `acabado <- FAMC`
- `subtipo <- FAM3`
- `figura <- source_description`

Fallbacks:

- `ced <- source_description` si `FAM7` viene vacio o `NO ASIGNADO`
- `figura <- extraerFiguraDeDescripcion(source_description)`

Notas:

- En valvulas `FAM3` normalmente representa el subtipo funcional:
  `BOLA`, `CHECK`, `COMPUERTA`, `MARIPOSA`.

### `TUBO_ACERO`

Categoria corta:

- `category = TUBERIA`

Interpretacion principal:

- `product = TUBO`
- `subcategory = TUBO_ACERO`
- `material <- FAM4`
- `diameter <- FAM8`
- `ced <- FAM7`
- `costura <- FAM3`
- `termino <- FAM5`
- `acabado <- FAMC`

Fallbacks:

- `costura <- source_description` si `FAM3` no es confiable
- `ced <- source_description` si `FAM7` viene vacio
- `material <- source_description` si `FAM4` contradice claramente la descripcion

Notas:

- En tubos de acero `FAM3` suele significar `CON COSTURA` o `SIN COSTURA`.
- Se detectaron conflictos reales donde `FAM4` trae plastico en tubos de acero.

### `TUBO_PLASTICO`

Categoria corta:

- `category = TUBERIA`

Interpretacion principal:

- `product = TUBO`
- `subcategory = TUBO_PLASTICO`
- `tipo = PLASTICO`
- `material <- FAM4`
- `diameter <- FAM8`
- `ced <- FAM7`
- `termino <- FAM5`

Fallbacks:

- `material <- source_description` si `FAM4` viene como `PLASTICO`
  y la descripcion contiene `PPR`, `PVC`, `CPVC`, `HDPE`, `PEAD`
- `ced <- source_description` si `FAM7` viene vacio

Notas:

- Aqui la descripcion pesa mas que la familia si `FAM4` viene generica.
- Caso conocido: `TUBO PPR ...` no debe quedar solo como `PLASTICO`.

### `CODO`

Categoria corta:

- `category = CONEXIONES`

Interpretacion principal:

- `product = CODO`
- `subcategory = CODO`
- `material <- FAM4`
- `diameter <- FAM8`
- `ced <- FAM7`
- `termino <- FAM5`
- `acabado <- FAMC`
- `radio <- FAM3`
- `angulo <- FAM3`
- `figura <- source_description`

Fallbacks:

- `radio <- source_description` si `FAM3` no es usable
- `angulo <- source_description` si `FAM3` no es usable
- `ced <- source_description` si `FAM7` viene vacio

Notas:

- En codos `FAM3` puede mezclar radio y angulo, por ejemplo `90 LR`.
- Conviene tratar `FAM3` como señal compuesta, no como columna atomica.

### `BRIDA`

Categoria corta:

- `category = CONEXIONES`

Interpretacion principal:

- `product = BRIDA`
- `subcategory = tipo de brida`
- `material <- FAM4`
- `diameter <- FAM8`
- `ced <- FAM7`
- `termino <- FAM5`
- `acabado <- FAMC`
- `tipo <- FAM3`
- `grado <- source_description`
- `presion <- source_description`

Fallbacks:

- `tipo <- source_description` si `FAM3` no es claro
- `grado <- source_description`
- `presion <- source_description`

Notas:

- En bridas la presion y el grado salen mejor del texto que de las familias.
- `FAM3` aqui suele representar el tipo de brida, no subtipo ni costura.

### `GENERAL`

Categoria corta:

- `category = por inferencia`

Interpretacion principal:

- `product <- detectProducto(source_description)`
- `material <- FAM4` o descripcion si es plastico
- `diameter <- FAM8`
- `ced <- source_description`
- `termino <- FAM5`
- `acabado <- FAMC`
- `subtipo <- FAM3`
- `tipo <- FAM2`
- `radio <- FAM3 o descripcion`
- `angulo <- FAM3 o descripcion`
- `costura <- FAM3 o descripcion`
- `grado <- source_description`
- `presion <- source_description`

Fallbacks:

- `first_word normalization`
- regex sobre descripcion
- reglas puntuales por token: `OLET`, `SWAGE`, `EMPAQUE`, `FILTRO`, etc.

Notas:

- Este bucket es transitorio; debe ir perdiendo volumen conforme crezca el diccionario.
- `FAM3` aqui es ambiguo y no debe mapearse a un solo atributo fijo.

## Lectura corta de familias

Interpretacion mas frecuente, no absoluta:

- `FAM2`: grupo comercial amplio o tipo base
- `FAM3`: atributo variable segun producto
- `FAM4`: material
- `FAM5`: termino o conexion
- `FAM7`: cedula, clase o espesor
- `FAM8`: diametro
- `FAMC`: acabado

## Regla critica

`FAM3` no puede tratarse como columna fija del dominio.

Segun el bucket:

- `VALVULA -> subtipo`
- `TUBO_ACERO -> costura`
- `CODO -> radio/angulo`
- `BRIDA -> tipo`
- `GENERAL -> atributo ambiguo`

## Ejemplos

### Ejemplo 1

Input ERP:

- `bucket = TUBO_ACERO`
- `FAM3 = SIN COSTURA`
- `FAM4 = ACERO AL CARBON`
- `FAM7 = 40`
- `FAM8 = 2"`

Salida normalizada:

- `product = TUBO`
- `category = TUBERIA`
- `subcategory = TUBO_ACERO`
- `costura = SIN COSTURA`
- `material = ACERO AL CARBON`
- `ced = 40`
- `diameter = 2"`

### Ejemplo 2

Input ERP:

- `bucket = CODO`
- `FAM3 = 90 LR`
- `FAM4 = ACERO INOXIDABLE`
- `FAM7 = 40`
- `FAM8 = 4"`

Salida normalizada:

- `product = CODO`
- `category = CONEXIONES`
- `radio = LR`
- `angulo = 90`
- `material = ACERO INOXIDABLE`
- `ced = 40`
- `diameter = 4"`

### Ejemplo 3

Input ERP:

- `bucket = TUBO_PLASTICO`
- `FAM4 = PLASTICO`
- `source_description = TUBO PPR CLASE 16 40MM TUBOPLUS 11/2"`

Salida normalizada:

- `product = TUBO`
- `category = TUBERIA`
- `subcategory = TUBO_PLASTICO`
- `material = PPR`

## Siguiente paso

Crear la tabla `products_normalized` separando:

- `raw_*`
- `normalized_*`
- `detection_*`
- `audit_*`
