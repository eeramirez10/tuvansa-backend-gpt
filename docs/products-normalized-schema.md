# Products Normalized Schema

## Objetivo

Definir la tabla `products_normalized` que va a guardar el catalogo limpio de Tuvansa
despues de leer el ERP y antes de indexar Pinecone.

La tabla debe separar:

- datos crudos del ERP
- datos normalizados del catalogo
- datos de deteccion y trazabilidad
- datos de sincronizacion

Scope del catalogo:

- `MID(ICOD, 1, 2) = '01'`

## Principios

1. El ERP sigue siendo la fuente original.
2. `products_normalized` es la fuente de lectura para web y busqueda.
3. Pinecone no se indexa directo desde el ERP.
4. Nunca se pierde el dato crudo; se guarda junto al dato normalizado.

## Tabla propuesta

Nombre:

- `products_normalized`
- `products_missing_ean`
- `product_images`

Motor sugerido:

- `InnoDB`

## Columnas

### Identidad y origen

- `id UUID PRIMARY KEY`
- `source_system VARCHAR(32) NOT NULL DEFAULT 'PROSCAI'`
- `source_country_code CHAR(2) NOT NULL DEFAULT '01'`
- `source_icod VARCHAR(64) NOT NULL`
- `source_ean VARCHAR(128) NOT NULL`

Regla:

- `UNIQUE KEY uq_products_normalized_source (source_system, source_ean)`

### Texto crudo del ERP

- `source_description1 TEXT NULL`
- `source_description2 TEXT NULL`
- `source_description TEXT NULL`

### Familias crudas del ERP

- `raw_fam2 VARCHAR(255) NULL`
- `raw_fam3 VARCHAR(255) NULL`
- `raw_fam4 VARCHAR(255) NULL`
- `raw_fam5 VARCHAR(255) NULL`
- `raw_fam7 VARCHAR(255) NULL`
- `raw_fam8 VARCHAR(255) NULL`
- `raw_famc VARCHAR(255) NULL`
- `raw_unidad VARCHAR(100) NULL`

### Deteccion y clasificacion

- `detection_bucket VARCHAR(32) NOT NULL`
- `detection_source VARCHAR(32) NOT NULL`
- `detection_first_word VARCHAR(100) NULL`
- `detection_first_word_product VARCHAR(100) NULL`
- `detection_confidence DECIMAL(5,2) NULL`
- `detection_notes TEXT NULL`

Uso:

- `detection_bucket`: `VALVULA`, `TUBO_ACERO`, `TUBO_PLASTICO`, `CODO`, `BRIDA`, `GENERAL`
- `detection_source`: `EAN`, `DESCRIPTION`, `MATERIAL`, `TEXT`, `MANUAL`

### Catalogo normalizado

- `normalized_product VARCHAR(120) NOT NULL`
- `normalized_category VARCHAR(120) NULL`
- `normalized_subcategory VARCHAR(120) NULL`
- `normalized_material VARCHAR(120) NULL`
- `normalized_tipo VARCHAR(120) NULL`
- `normalized_subtipo VARCHAR(120) NULL`
- `normalized_diameter VARCHAR(120) NULL`
- `normalized_ced VARCHAR(120) NULL`
- `normalized_costura VARCHAR(120) NULL`
- `normalized_termino VARCHAR(120) NULL`
- `normalized_acabado VARCHAR(120) NULL`
- `normalized_radio VARCHAR(120) NULL`
- `normalized_angulo VARCHAR(120) NULL`
- `normalized_presion VARCHAR(120) NULL`
- `normalized_grado VARCHAR(120) NULL`
- `normalized_figura VARCHAR(120) NULL`

### Metadatos visuales

- `visual_material VARCHAR(120) NULL`
- `visual_color VARCHAR(120) NULL`
- `visual_finish VARCHAR(120) NULL`
- `visual_shape VARCHAR(120) NULL`
- `visual_connection_type VARCHAR(120) NULL`
- `visual_special_features VARCHAR(255) NULL`
- `image_prompt TEXT NULL`
- `image_negative_prompt TEXT NULL`

### Textos publicos para web y Pinecone

- `display_name VARCHAR(255) NULL`
- `display_description TEXT NULL`
- `search_text LONGTEXT NULL`

Regla:

- `display_name` debe ser el nombre limpio y corto
- `display_description` debe ser la descripcion visible en web
- `search_text` debe mezclar descripcion limpia + atributos normalizados
- `image_prompt` debe describir el producto con suficiente precision visual para IA
- `image_negative_prompt` debe evitar ruido visual comun

### Estado de catalogo

- `is_active TINYINT(1) NOT NULL DEFAULT 1`
- `is_searchable TINYINT(1) NOT NULL DEFAULT 1`
- `requires_manual_review TINYINT(1) NOT NULL DEFAULT 0`
- `manual_review_reason VARCHAR(255) NULL`

### Integracion vectorial

- `pinecone_namespace VARCHAR(64) NULL`
- `pinecone_vector_id VARCHAR(128) NULL`
- `pinecone_last_upsert_at DATETIME NULL`

### Auditoria y sincronizacion

- `erp_last_seen_at DATETIME NULL`
- `normalized_at DATETIME NULL`
- `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

## Indices sugeridos

- `INDEX idx_products_normalized_ean (source_ean)`
- `INDEX idx_products_normalized_bucket (detection_bucket)`
- `INDEX idx_products_normalized_product (normalized_product)`
- `INDEX idx_products_normalized_category (normalized_category, normalized_subcategory)`
- `INDEX idx_products_normalized_material (normalized_material)`
- `INDEX idx_products_normalized_diameter (normalized_diameter)`
- `INDEX idx_products_normalized_active (is_active, is_searchable)`
- `INDEX idx_products_normalized_review (requires_manual_review)`
- `INDEX idx_products_normalized_pinecone (pinecone_vector_id)`

## Mapeo corto desde la matriz

### `VALVULA`

- `normalized_product = 'VALVULA'`
- `normalized_category = 'VALVULAS'`
- `normalized_subcategory = normalized_subtipo`
- `normalized_material <- raw_fam4`
- `normalized_diameter <- raw_fam8`
- `normalized_ced <- raw_fam7 o source_description`
- `normalized_termino <- raw_fam5`
- `normalized_acabado <- raw_famc`
- `normalized_subtipo <- raw_fam3`

### `TUBO_ACERO`

- `normalized_product = 'TUBO'`
- `normalized_category = 'TUBERIA'`
- `normalized_subcategory = 'TUBO_ACERO'`
- `normalized_material <- raw_fam4 o source_description`
- `normalized_diameter <- raw_fam8`
- `normalized_ced <- raw_fam7 o source_description`
- `normalized_costura <- raw_fam3 o source_description`

### `TUBO_PLASTICO`

- `normalized_product = 'TUBO'`
- `normalized_category = 'TUBERIA'`
- `normalized_subcategory = 'TUBO_PLASTICO'`
- `normalized_tipo = 'PLASTICO'`
- `normalized_material <- raw_fam4 o source_description`
- `normalized_diameter <- raw_fam8`
- `normalized_ced <- raw_fam7 o source_description`

### `CODO`

- `normalized_product = 'CODO'`
- `normalized_category = 'CONEXIONES'`
- `normalized_subcategory = 'CODO'`
- `normalized_material <- raw_fam4`
- `normalized_diameter <- raw_fam8`
- `normalized_ced <- raw_fam7 o source_description`
- `normalized_radio <- raw_fam3 o source_description`
- `normalized_angulo <- raw_fam3 o source_description`

### `BRIDA`

- `normalized_product = 'BRIDA'`
- `normalized_category = 'CONEXIONES'`
- `normalized_subcategory <- raw_fam3 o source_description`
- `normalized_material <- raw_fam4`
- `normalized_diameter <- raw_fam8`
- `normalized_ced <- raw_fam7`
- `normalized_termino <- raw_fam5`
- `normalized_acabado <- raw_famc`
- `normalized_presion <- source_description`
- `normalized_grado <- source_description`

### `GENERAL`

- `normalized_product <- deteccion por texto`
- `normalized_category <- catalog rule`
- `normalized_material <- raw_fam4 o source_description`
- `normalized_diameter <- raw_fam8`
- `normalized_ced <- source_description`
- `normalized_costura <- raw_fam3 o source_description`
- `normalized_radio <- raw_fam3 o source_description`
- `normalized_angulo <- raw_fam3 o source_description`
- `requires_manual_review = 1` cuando no haya confianza suficiente

## Reglas de negocio

1. `source_ean` es la llave canonica del catalogo.
2. `source_icod` solo es referencia ERP por sucursal.
3. Los productos sin `source_ean` no deben sincronizarse al catalogo final; solo deben reportarse.
4. Los productos sin `source_ean` deben guardarse en `products_missing_ean` por `source_system + source_icod`.
5. `normalized_product` nunca debe quedar vacio.
6. Si `normalized_product = GENERAL`, evaluar `requires_manual_review = 1`.
7. Si `raw_fam4 = PLASTICO` pero el texto dice `PPR`, `PVC`, `CPVC`, `HDPE`, prevalece el texto.
8. Si el bucket indica `TUBO_ACERO` y `raw_fam4` dice plastico, se marca observacion en `detection_notes`.

## Tabla de pendientes

`products_missing_ean` guarda registros ERP que no pueden entrar al catalogo canonico
porque todavia no tienen `source_ean`.

Llave:

- `source_system + source_icod`

Uso:

- seguimiento con el area responsable
- reintento de sync despues de que el ERP tenga EAN
- limpieza automatica cuando el mismo `source_icod` ya entra a `products_normalized`

## Tabla de imagenes

`product_images` guarda resultados de generacion y variantes de imagen por producto.

Campos recomendados:

- `id UUID PRIMARY KEY`
- `product_normalized_id UUID NOT NULL`
- `image_type`
- `generation_status`
- `storage_provider`
- `storage_url`
- `prompt`
- `negative_prompt`
- `generation_model`
- `background`
- `angle`
- `width`
- `height`
- `is_primary`
- `created_at`
- `updated_at`

Uso:

- guardar URL final de imagen
- guardar prompt exacto usado para regenerar
- mantener varias variantes por producto
- marcar una imagen principal para web

## Ejemplo de registro

- `id = 5d4dc4e7-3b31-46ec-bd79-10ff8a8a3d7a`
- `source_icod = 01012345`
- `source_ean = T11/2PPRTBP`
- `detection_bucket = TUBO_PLASTICO`
- `detection_source = MATERIAL`
- `detection_first_word = TUBO`
- `normalized_product = TUBO`
- `normalized_category = TUBERIA`
- `normalized_subcategory = TUBO_PLASTICO`
- `normalized_material = PPR`
- `normalized_diameter = 1 1/2"`
- `normalized_ced = ''`
- `display_name = TUBO PPR 1 1/2"`

## SQL para Neon/Postgres

Archivo recomendado para ejecutar en Neon:

- `docs/sql/products_normalized.postgres.sql`

## Siguiente paso

Crear un DDL inicial y despues implementar el pipeline:

- `ERP -> extract`
- `extract -> normalize`
- `normalize -> upsert products_normalized`
- `products_normalized -> Pinecone`
