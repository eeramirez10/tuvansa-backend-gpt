-- CreateTable
CREATE TABLE "products_normalized" (
    "id" BIGSERIAL NOT NULL,
    "source_system" TEXT NOT NULL DEFAULT 'PROSCAI',
    "source_country_code" CHAR(2) NOT NULL DEFAULT '01',
    "source_icod" TEXT NOT NULL,
    "source_ean" TEXT,
    "source_description1" TEXT,
    "source_description2" TEXT,
    "source_description" TEXT,
    "raw_fam2" TEXT,
    "raw_fam3" TEXT,
    "raw_fam4" TEXT,
    "raw_fam5" TEXT,
    "raw_fam7" TEXT,
    "raw_fam8" TEXT,
    "raw_famc" TEXT,
    "raw_unidad" TEXT,
    "detection_bucket" TEXT NOT NULL,
    "detection_source" TEXT NOT NULL,
    "detection_first_word" TEXT,
    "detection_first_word_product" TEXT,
    "detection_confidence" DECIMAL(5,2),
    "detection_notes" TEXT,
    "normalized_product" TEXT NOT NULL,
    "normalized_category" TEXT,
    "normalized_subcategory" TEXT,
    "normalized_material" TEXT,
    "normalized_tipo" TEXT,
    "normalized_subtipo" TEXT,
    "normalized_diameter" TEXT,
    "normalized_ced" TEXT,
    "normalized_costura" TEXT,
    "normalized_termino" TEXT,
    "normalized_acabado" TEXT,
    "normalized_radio" TEXT,
    "normalized_angulo" TEXT,
    "normalized_presion" TEXT,
    "normalized_grado" TEXT,
    "normalized_figura" TEXT,
    "display_name" TEXT,
    "display_description" TEXT,
    "search_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_searchable" BOOLEAN NOT NULL DEFAULT true,
    "requires_manual_review" BOOLEAN NOT NULL DEFAULT false,
    "manual_review_reason" TEXT,
    "pinecone_namespace" TEXT,
    "pinecone_vector_id" TEXT,
    "pinecone_last_upsert_at" TIMESTAMPTZ,
    "erp_last_seen_at" TIMESTAMPTZ,
    "normalized_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_normalized_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_products_normalized_ean" ON "products_normalized"("source_ean");

-- CreateIndex
CREATE INDEX "idx_products_normalized_bucket" ON "products_normalized"("detection_bucket");

-- CreateIndex
CREATE INDEX "idx_products_normalized_product" ON "products_normalized"("normalized_product");

-- CreateIndex
CREATE INDEX "idx_products_normalized_category" ON "products_normalized"("normalized_category", "normalized_subcategory");

-- CreateIndex
CREATE INDEX "idx_products_normalized_material" ON "products_normalized"("normalized_material");

-- CreateIndex
CREATE INDEX "idx_products_normalized_diameter" ON "products_normalized"("normalized_diameter");

-- CreateIndex
CREATE INDEX "idx_products_normalized_active" ON "products_normalized"("is_active", "is_searchable");

-- CreateIndex
CREATE INDEX "idx_products_normalized_review" ON "products_normalized"("requires_manual_review");

-- CreateIndex
CREATE INDEX "idx_products_normalized_pinecone" ON "products_normalized"("pinecone_vector_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_products_normalized_source" ON "products_normalized"("source_system", "source_icod");
