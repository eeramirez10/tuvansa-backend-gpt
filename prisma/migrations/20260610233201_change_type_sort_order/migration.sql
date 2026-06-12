-- DropForeignKey
ALTER TABLE "product_technical_specs" DROP CONSTRAINT "product_technical_specs_product_normalized_id_fkey";

-- AlterTable
ALTER TABLE "product_images" ALTER COLUMN "image_type" SET DEFAULT 'PRIMARY',
ALTER COLUMN "generation_status" SET DEFAULT 'PENDING',
ALTER COLUMN "storage_provider" DROP DEFAULT,
ALTER COLUMN "storage_url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_technical_specs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "product_technical_specs" ADD CONSTRAINT "product_technical_specs_product_normalized_id_fkey" FOREIGN KEY ("product_normalized_id") REFERENCES "products_normalized"("id") ON DELETE CASCADE ON UPDATE CASCADE;
