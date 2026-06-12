/*
  Warnings:

  - A unique constraint covering the columns `[source_system,source_ean]` on the table `products_normalized` will be added. If there are existing duplicate values, this will fail.
  - Made the column `source_ean` on table `products_normalized` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "uq_products_normalized_source";

-- AlterTable
ALTER TABLE "products_normalized" ALTER COLUMN "source_ean" SET NOT NULL;

-- CreateTable
CREATE TABLE "products_missing_ean" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_system" TEXT NOT NULL DEFAULT 'PROSCAI',
    "source_country_code" CHAR(2) NOT NULL DEFAULT '01',
    "branch_code" CHAR(2),
    "source_icod" TEXT NOT NULL,
    "source_description" TEXT,
    "detection_bucket" TEXT,
    "detection_source" TEXT,
    "detection_first_word" TEXT,
    "normalized_product" TEXT,
    "normalized_category" TEXT,
    "normalized_material" TEXT,
    "normalized_diameter" TEXT,
    "normalized_ced" TEXT,
    "normalized_costura" TEXT,
    "normalized_radio" TEXT,
    "normalized_angulo" TEXT,
    "manual_review_reason" TEXT,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_missing_ean_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_products_missing_ean_branch_code" ON "products_missing_ean"("branch_code");

-- CreateIndex
CREATE INDEX "idx_products_missing_ean_bucket" ON "products_missing_ean"("detection_bucket");

-- CreateIndex
CREATE INDEX "idx_products_missing_ean_product" ON "products_missing_ean"("normalized_product");

-- CreateIndex
CREATE UNIQUE INDEX "uq_products_missing_ean_source" ON "products_missing_ean"("source_system", "source_icod");

-- CreateIndex
CREATE INDEX "idx_products_normalized_source_icod" ON "products_normalized"("source_icod");

-- CreateIndex
CREATE UNIQUE INDEX "uq_products_normalized_source" ON "products_normalized"("source_system", "source_ean");
