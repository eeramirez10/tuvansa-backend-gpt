ALTER TABLE "product_images"
  ALTER COLUMN "image_type" SET DEFAULT 'GALLERY',
  ALTER COLUMN "generation_status" SET DEFAULT 'READY';

ALTER TABLE "product_images"
  ADD COLUMN IF NOT EXISTS "file_name" TEXT,
  ADD COLUMN IF NOT EXISTS "mime_type" TEXT,
  ADD COLUMN IF NOT EXISTS "alt_text" TEXT,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "product_images"
  ALTER COLUMN "storage_url" SET NOT NULL;

ALTER TABLE "product_images"
  ALTER COLUMN "storage_provider" SET DEFAULT 'INTERNAL';

ALTER TABLE "product_images"
  ADD CONSTRAINT "chk_product_images_sort_order_range"
  CHECK ("sort_order" BETWEEN 1 AND 4);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_images_product_sort_order"
  ON "product_images" ("product_normalized_id", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_images_primary_per_product"
  ON "product_images" ("product_normalized_id")
  WHERE "is_primary" = true;