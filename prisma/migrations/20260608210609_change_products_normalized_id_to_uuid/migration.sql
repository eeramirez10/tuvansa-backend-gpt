/*
  Warnings:

  - The primary key for the `products_normalized` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `products_normalized` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "products_normalized" DROP CONSTRAINT "products_normalized_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "products_normalized_pkey" PRIMARY KEY ("id");
