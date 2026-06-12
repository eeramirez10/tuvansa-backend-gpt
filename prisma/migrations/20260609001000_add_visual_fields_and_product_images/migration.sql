ALTER TABLE "products_normalized"
ADD COLUMN IF NOT EXISTS "visual_material" TEXT,
ADD COLUMN IF NOT EXISTS "visual_color" TEXT,
ADD COLUMN IF NOT EXISTS "visual_finish" TEXT,
ADD COLUMN IF NOT EXISTS "visual_shape" TEXT,
ADD COLUMN IF NOT EXISTS "visual_connection_type" TEXT,
ADD COLUMN IF NOT EXISTS "visual_special_features" TEXT,
ADD COLUMN IF NOT EXISTS "image_prompt" TEXT,
ADD COLUMN IF NOT EXISTS "image_negative_prompt" TEXT;

CREATE TABLE IF NOT EXISTS "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_normalized_id" UUID NOT NULL,
    "image_type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "generation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "storage_provider" TEXT,
    "storage_url" TEXT,
    "prompt" TEXT,
    "negative_prompt" TEXT,
    "generation_model" TEXT,
    "background" TEXT,
    "angle" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_product_normalized_id_fkey"
      FOREIGN KEY ("product_normalized_id")
      REFERENCES "products_normalized"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_product_images_product_id"
ON "product_images"("product_normalized_id");

CREATE INDEX IF NOT EXISTS "idx_product_images_status"
ON "product_images"("generation_status");

CREATE INDEX IF NOT EXISTS "idx_product_images_primary"
ON "product_images"("is_primary");
