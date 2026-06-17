DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TechnicalSummarySource'
  ) THEN
    CREATE TYPE "TechnicalSummarySource" AS ENUM ('PIPELINE', 'AI_BASE', 'AI_ENRICHED');
  END IF;
END $$;

ALTER TABLE "products_normalized"
  ADD COLUMN IF NOT EXISTS "technical_summary_source" "TechnicalSummarySource",
  ADD COLUMN IF NOT EXISTS "technical_summary_generated_at" TIMESTAMPTZ;

UPDATE "products_normalized"
SET
  "technical_summary_source" = 'PIPELINE',
  "technical_summary_generated_at" = COALESCE("normalized_at", NOW())
WHERE "technical_summary" IS NOT NULL
  AND TRIM("technical_summary") <> ''
  AND "technical_summary_source" IS NULL;