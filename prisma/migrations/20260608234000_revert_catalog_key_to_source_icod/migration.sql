DROP INDEX IF EXISTS "uq_products_normalized_source";

CREATE UNIQUE INDEX "uq_products_normalized_source"
ON "products_normalized"("source_system", "source_icod");
