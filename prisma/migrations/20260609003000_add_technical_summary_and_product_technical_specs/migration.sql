ALTER TABLE "products_normalized"
ADD COLUMN "technical_summary" TEXT,
ADD COLUMN "normalized_norm" TEXT,
ADD COLUMN "normalized_coating" TEXT,
ADD COLUMN "normalized_length" TEXT;

CREATE TABLE "product_technical_specs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_normalized_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "standard" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "product_technical_specs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_technical_specs_product_normalized_id_fkey"
    FOREIGN KEY ("product_normalized_id")
    REFERENCES "products_normalized"("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_technical_specs_product_id"
  ON "product_technical_specs"("product_normalized_id");

CREATE INDEX "idx_product_technical_specs_sort"
  ON "product_technical_specs"("product_normalized_id", "sort_order");
