CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products_normalized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system VARCHAR(32) NOT NULL DEFAULT 'PROSCAI',
  source_country_code CHAR(2) NOT NULL DEFAULT '01',
  source_icod VARCHAR(64) NOT NULL,
  source_ean VARCHAR(128) NOT NULL,

  source_description1 TEXT,
  source_description2 TEXT,
  source_description TEXT,

  raw_fam2 VARCHAR(255),
  raw_fam3 VARCHAR(255),
  raw_fam4 VARCHAR(255),
  raw_fam5 VARCHAR(255),
  raw_fam7 VARCHAR(255),
  raw_fam8 VARCHAR(255),
  raw_famc VARCHAR(255),
  raw_unidad VARCHAR(100),

  detection_bucket VARCHAR(32) NOT NULL,
  detection_source VARCHAR(32) NOT NULL,
  detection_first_word VARCHAR(100),
  detection_first_word_product VARCHAR(100),
  detection_confidence NUMERIC(5,2),
  detection_notes TEXT,

  normalized_product VARCHAR(120) NOT NULL,
  normalized_category VARCHAR(120),
  normalized_subcategory VARCHAR(120),
  normalized_material VARCHAR(120),
  normalized_tipo VARCHAR(120),
  normalized_subtipo VARCHAR(120),
  normalized_diameter VARCHAR(120),
  normalized_ced VARCHAR(120),
  normalized_costura VARCHAR(120),
  normalized_termino VARCHAR(120),
  normalized_acabado VARCHAR(120),
  normalized_radio VARCHAR(120),
  normalized_angulo VARCHAR(120),
  normalized_presion VARCHAR(120),
  normalized_grado VARCHAR(120),
  normalized_figura VARCHAR(120),

  display_name VARCHAR(255),
  display_description TEXT,
  search_text TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
  requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  manual_review_reason VARCHAR(255),

  pinecone_namespace VARCHAR(64),
  pinecone_vector_id VARCHAR(128),
  pinecone_last_upsert_at TIMESTAMPTZ,

  erp_last_seen_at TIMESTAMPTZ,
  normalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_products_normalized_source UNIQUE (source_system, source_ean)
);

CREATE INDEX IF NOT EXISTS idx_products_normalized_ean
  ON products_normalized (source_ean);

CREATE INDEX IF NOT EXISTS idx_products_normalized_bucket
  ON products_normalized (detection_bucket);

CREATE INDEX IF NOT EXISTS idx_products_normalized_product
  ON products_normalized (normalized_product);

CREATE INDEX IF NOT EXISTS idx_products_normalized_category
  ON products_normalized (normalized_category, normalized_subcategory);

CREATE INDEX IF NOT EXISTS idx_products_normalized_material
  ON products_normalized (normalized_material);

CREATE INDEX IF NOT EXISTS idx_products_normalized_diameter
  ON products_normalized (normalized_diameter);

CREATE INDEX IF NOT EXISTS idx_products_normalized_active
  ON products_normalized (is_active, is_searchable);

CREATE INDEX IF NOT EXISTS idx_products_normalized_review
  ON products_normalized (requires_manual_review);

CREATE INDEX IF NOT EXISTS idx_products_normalized_pinecone
  ON products_normalized (pinecone_vector_id);

CREATE INDEX IF NOT EXISTS idx_products_normalized_source_icod
  ON products_normalized (source_icod);

CREATE INDEX IF NOT EXISTS idx_products_normalized_search_text
  ON products_normalized USING GIN (to_tsvector('simple', COALESCE(search_text, '')));

CREATE OR REPLACE FUNCTION set_products_normalized_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_normalized_updated_at ON products_normalized;

CREATE TRIGGER trg_products_normalized_updated_at
BEFORE UPDATE ON products_normalized
FOR EACH ROW
EXECUTE FUNCTION set_products_normalized_updated_at();
