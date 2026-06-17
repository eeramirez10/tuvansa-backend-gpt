import mysql from 'mysql2/promise';

import { envs } from '../../config/envs';
import {
  buscarCostura,
  cleanDiameter,
  detectarMaterialPlastico,
  esPlasticoDesdeBD,
  extractAnguloRadio,
  extraerCedulaDeDescripcion,
  extraerFiguraDeDescripcion,
  extraerGradoMaterialBrida,
  extraerPresion,
  normalizarDescripcionSWPorCedula,
  normalizarGrados,
  normalizeValue,
  quitarPalabraBrida,
  sanitizeForDB,
  verifyData,
} from '../helpers/sanitizeSql';
import { detectProducto, extraerDesdeTubo, normalizarTubo } from '../../utils/normalize-text';

type QueryRow = Record<string, any>;
type TechnicalSpecRecord = {
  label: string;
  value: string;
  standard?: string;
  sort_order: number;
};

type PreviewParams = {
  limit: number;
  offset: number;
  categoryBucket?: string;
};

export class ProscaiProductAnalysisService {
  private readonly pool = mysql.createPool({
    host: envs.URL_MYSQL,
    user: envs.USER_MYSQL,
    password: envs.PASSWORD_MYSQL,
    database: envs.DB_MYSQL,
  });

  private readonly plasticMaterials = ['HDPE', 'PVC', 'PLASTICO', 'CPVC', 'PPR'];

  private readonly allowedBuckets = new Set([
    'VALVULA',
    'TUBO_ACERO',
    'CODO',
    'BRIDA',
    'TUBO_PLASTICO',
    'GENERAL',
  ]);

  private get plasticMaterialsSql(): string {
    return this.plasticMaterials.map((material) => `'${material}'`).join(',');
  }

  private buildCommonProductsCte(): string {
    return String.raw`
WITH raw AS (
  SELECT
    FINV.ICOD,
    FINV.IEAN AS ean,
    COALESCE(FINV2.I2DESCR, '') AS description2,
    COALESCE(FINV.IDESCR, '') AS description1,
    COALESCE(FAM2.FAMDESCR, 'NO ASIGNADO') AS fam2,
    COALESCE(FAM3.FAMDESCR, 'NO ASIGNADO') AS fam3,
    COALESCE(FAM4.FAMDESCR, 'NO ASIGNADO') AS fam4,
    COALESCE(FAM5.FAMDESCR, 'NO ASIGNADO') AS fam5,
    COALESCE(FAM7.FAMDESCR, 'NO ASIGNADO') AS fam7,
    COALESCE(FAM8.FAMDESCR, 'NO ASIGNADO') AS fam8,
    COALESCE(FAMC.FAMDESCR, 'NO ASIGNADO') AS famc,
    COALESCE(FUNIDAD.UDESCR, 'NO ASIGNADO') AS unidad
  FROM FINV
  LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM = FINV.IFAM2
  LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM = FINV.IFAM3
  LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM = FINV.IFAM4
  LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM = FINV.IFAM5
  LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM = FINV.IFAM7
  LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM = FINV.IFAM8
  LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM = FINV.IFAMC
  LEFT JOIN FUNIDAD ON FUNIDAD.UCOD = FINV.IUM
  LEFT JOIN FINV2 ON FINV2.I2KEY = FINV.ISEQ
  WHERE MID(FINV.ICOD, 1, 2) = '01'
),
cleaned AS (
  SELECT
    raw.*,
    CASE
      WHEN raw.description2 <> '' THEN raw.description2
      ELSE raw.description1
    END AS source_description,
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      (
                        CONVERT(
                          CASE
                            WHEN raw.description2 <> '' THEN raw.description2
                            ELSE raw.description1
                          END USING utf8mb4
                        )
                      ) COLLATE utf8mb4_0900_ai_ci,
                      _utf8mb4'[°º"''´\`′″¨×]+', _utf8mb4' '
                    ),
                    _utf8mb4'[(),:;!?]+', _utf8mb4' '
                  ),
                  _utf8mb4'\\s+', _utf8mb4' '
                ),
                _utf8mb4'(^|\\s)(de|para|con)\\.?(?=\\s|$)', _utf8mb4' ', 1, 0, 'i'
              ),
              _utf8mb4'(^|\\s)ced\\.?(?=\\s|$)', _utf8mb4' ', 1, 0, 'i'
            ),
            _utf8mb4'(^|\\s)\\S*[0-9]\\S*(?=\\s|$)', _utf8mb4' '
          ),
          _utf8mb4'(^|\\s)\\S*/\\S*(?=\\s|$)', _utf8mb4' '
        ),
        _utf8mb4'(^|\\s)\\S*[x]\\S*(?=\\s|$)', _utf8mb4' ', 1, 0, 'i'
      )
    ) AS cleaned_description
  FROM raw
),
tokenized AS (
  SELECT
    cleaned.*,
    REGEXP_SUBSTR(
      cleaned.cleaned_description,
      _utf8mb4'^(?:[[:alpha:]]+(?:[-_.][[:alpha:]]+)*\\.?)(?:\\s+[[:alpha:]]+(?:[-_.][[:alpha:]]+)*\\.?)'
    ) AS dos_palabras
  FROM cleaned
),
signals AS (
  SELECT
    tokenized.*,
    UPPER(REPLACE(SUBSTRING_INDEX(tokenized.dos_palabras, ' ', 1), '.', '')) AS tok1,
    UPPER(REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(tokenized.dos_palabras, ' ', 2), ' ', -1), '.', '')) AS tok2,
    LEFT(tokenized.ean, 1) AS ean_prefix_1,
    LEFT(tokenized.ean, 3) AS ean_prefix_3,
    LEFT(tokenized.ICOD, 2) AS icod_prefix_2,
    CASE
      WHEN tokenized.ean LIKE 'V%' THEN 'VALVULA'
      WHEN tokenized.ean LIKE 'TSC%' OR tokenized.ean LIKE 'TCC%' THEN 'TUBO_ACERO'
      ELSE NULL
    END AS ean_signal,
    CASE
      WHEN UPPER(tokenized.source_description) LIKE 'CODO%' THEN 'CODO'
      WHEN UPPER(tokenized.source_description) LIKE 'BRIDA%' THEN 'BRIDA'
      ELSE NULL
    END AS desc_signal,
    CASE
      WHEN UPPER(tokenized.source_description) LIKE 'TUB%'
       AND tokenized.fam4 IN (${this.plasticMaterialsSql}) THEN 'TUBO_PLASTICO'
      ELSE NULL
    END AS material_signal
  FROM tokenized
),
classified AS (
  SELECT
    signals.*,
    CASE
      WHEN signals.dos_palabras IS NULL THEN NULL
      WHEN signals.tok1 IN ('PVC','CPVC','HDPE','PPR','PP','PPH','PP-H','PEAD','PE','HD')
        AND signals.tok2 IN ('TUBERIA','TUBO') THEN 'TUBO'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^VALV(ULA)?$', 'i') THEN 'VALVULA'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^RED(UCCION)?$', 'i') THEN 'REDUCCION'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^REST$', 'i') THEN 'RESTRICTOR'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^STUB$', 'i') THEN 'STUB-END'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^TE$', 'i') THEN 'TEE'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^Y(EE)?$', 'i') THEN 'YEE'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^TUB(ERIA|O)?$', 'i') THEN 'TUBO'
      WHEN REGEXP_LIKE(signals.tok1, _utf8mb4'^(ABRAZADERA|ADAPTADOR|BRIDA|CODO|COPLE|CRUZ|CURVA|NIPLE|UNION|TAPON|CONECTOR|ROCIADOR|LLAVE|TUERCA|REGISTRO|RESTRICTOR|SALVATUBOS)$', 'i') THEN UPPER(signals.tok1)
      ELSE NULL
    END AS derived_product
  FROM signals
)
`;
  }

  private buildFirstWordProductCase(tokenSql: string): string {
    return `
      CASE
        WHEN ${tokenSql} IN ('VALV', 'VALVULA', 'VÁLVULA') THEN 'VALVULA'
        WHEN ${tokenSql} IN ('TUBO', 'TUBERIA', 'TUBERÍA') THEN 'TUBO'
        WHEN ${tokenSql} IN ('CODO', 'COD') THEN 'CODO'
        WHEN ${tokenSql} IN ('BRIDA', 'CIEGA') THEN 'BRIDA'
        WHEN ${tokenSql} IN ('RED', 'REDUCCION', 'REDUCCIÓN') THEN 'REDUCCION'
        WHEN ${tokenSql} IN ('COPLE', 'ACOPLE') THEN 'COPLE'
        WHEN ${tokenSql} IN ('NIPLE') THEN 'NIPLE'
        WHEN ${tokenSql} IN ('TEE', 'TE') THEN 'TEE'
        WHEN ${tokenSql} IN ('YEE', 'YE', 'Y') THEN 'YEE'
        WHEN ${tokenSql} IN ('TAPON', 'TAPONES', 'TAPÓN') THEN 'TAPON'
        WHEN ${tokenSql} IN ('CONECTOR') THEN 'CONECTOR'
        WHEN ${tokenSql} IN ('ADAPTADOR') THEN 'ADAPTADOR'
        WHEN ${tokenSql} IN ('ABRAZADERA') THEN 'ABRAZADERA'
        WHEN ${tokenSql} IN ('UNION', 'UNIÓN') THEN 'UNION'
        WHEN ${tokenSql} IN ('CURVA') THEN 'CURVA'
        WHEN ${tokenSql} IN ('CRUZ') THEN 'CRUZ'
        WHEN ${tokenSql} IN ('ROCIADOR') THEN 'ROCIADOR'
        WHEN ${tokenSql} IN ('KIT') THEN 'KIT'
        WHEN ${tokenSql} IN ('CONDULET') THEN 'CONDULET'
        WHEN ${tokenSql} IN ('MANGUERA') THEN 'MANGUERA'
        WHEN ${tokenSql} IN ('MANGUITO') THEN 'MANGUITO'
        WHEN ${tokenSql} IN ('TUERCA', 'TUERCAS') THEN 'TUERCA'
        WHEN ${tokenSql} IN ('TORNILLO', 'TORNILLOS') THEN 'TORNILLO'
        WHEN ${tokenSql} IN ('EMPAQUE', 'JUNTA') THEN 'EMPAQUE'
        WHEN ${tokenSql} IN ('FILTRO') THEN 'FILTRO'
        WHEN ${tokenSql} IN ('ESPARRAGO', 'ESPÁRRAGO') THEN 'ESPARRAGO'
        WHEN ${tokenSql} IN ('SOPORTE') THEN 'SOPORTE'
        WHEN ${tokenSql} IN ('NIPOLET', 'WELDOLET', 'THREDOLET', 'SOCKOLET', 'LATROLET', 'SNAP-LET') THEN 'OLET'
        WHEN ${tokenSql} IN ('SWAGE') THEN 'SWAGE'
        WHEN ${tokenSql} IN ('BOQUILLA') THEN 'BOQUILLA'
        WHEN ${tokenSql} IN ('TAPA') THEN 'TAPA'
        WHEN ${tokenSql} IN ('JUEGO') THEN 'KIT'
        WHEN ${tokenSql} IN ('MEDIO') THEN 'COPLE'
        WHEN ${tokenSql} IN ('LLAVE') THEN 'LLAVE'
        WHEN ${tokenSql} IN ('ARANDELA') THEN 'ARANDELA'
        WHEN ${tokenSql} IN ('CEMENTO') THEN 'CEMENTO'
        WHEN ${tokenSql} IN ('GABINETE') THEN 'GABINETE'
        WHEN ${tokenSql} IN ('DETECTOR') THEN 'DETECTOR'
        WHEN ${tokenSql} IN ('MANOMETRO', 'MANÓMETRO') THEN 'MANOMETRO'
        WHEN ${tokenSql} IN ('MONTURA') THEN 'MONTURA'
        WHEN ${tokenSql} IN ('CARRETE') THEN 'CARRETE'
        WHEN ${tokenSql} IN ('STUB', 'STUB-END') THEN 'STUB-END'
        WHEN ${tokenSql} IN ('TRAMPA') THEN 'TRAMPA'
        WHEN ${tokenSql} IN ('CAJA') THEN 'CAJA'
        WHEN ${tokenSql} IN ('CONTRABRIDA') THEN 'CONTRABRIDA'
        WHEN ${tokenSql} IN ('PERFIL') THEN 'PERFIL'
        WHEN ${tokenSql} IN ('INSERTO') THEN 'INSERTO'
        WHEN ${tokenSql} IN ('CHAPETON', 'CHAPETÓN') THEN 'CHAPETON'
        WHEN ${tokenSql} IN ('EXTINTOR') THEN 'EXTINTOR'
        WHEN ${tokenSql} IN ('BARRA') THEN 'BARRA'
        ELSE 'GENERAL'
      END
    `;
  }

  private buildFirstWordProductsCte(): string {
    const productCase = this.buildFirstWordProductCase('first_word');

    return `
      WITH base AS (
        SELECT
          FINV.ICOD,
          FINV.IEAN AS ean,
          TRIM(
            CASE
              WHEN COALESCE(FINV2.I2DESCR, '') <> '' THEN FINV2.I2DESCR
              ELSE COALESCE(FINV.IDESCR, '')
            END
          ) AS source_description
        FROM FINV
        LEFT JOIN FINV2 ON FINV2.I2KEY = FINV.ISEQ
        WHERE MID(FINV.ICOD, 1, 2) = '01'
      ),
      first_token AS (
        SELECT
          ICOD,
          ean,
          source_description,
          UPPER(
            TRIM(
              REGEXP_REPLACE(
                SUBSTRING_INDEX(source_description, ' ', 1),
                '[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9-]',
                ''
              )
            )
          ) AS first_word
        FROM base
        WHERE source_description <> ''
      ),
      normalized AS (
        SELECT
          ICOD,
          ean,
          source_description,
          first_word,
          ${productCase} AS normalized_product,
          CASE
            WHEN ${productCase} <> 'GENERAL' THEN 'LIKELY_PRODUCT'
            ELSE 'REVIEW'
          END AS analysis_bucket
        FROM first_token
      )
    `;
  }

  private normalizeBucket(categoryBucket?: string): string | undefined {
    if (!categoryBucket) return undefined;
    const normalized = categoryBucket.trim().toUpperCase();
    return this.allowedBuckets.has(normalized) ? normalized : undefined;
  }

  private async queryRows<T = QueryRow>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  private normalizePositiveInt(value: number, fallback: number, max = 1000): number {
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return Math.min(Math.floor(value), max);
  }

  private normalizeOffset(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
  }

  private buildCategoryBucketCase(): string {
    return `
      CASE
        WHEN ean_signal IS NOT NULL THEN ean_signal
        WHEN desc_signal IS NOT NULL THEN desc_signal
        WHEN material_signal IS NOT NULL THEN material_signal
        ELSE 'GENERAL'
      END
    `;
  }

  private buildDetectionSourceCase(): string {
    return `
      CASE
        WHEN ean_signal IS NOT NULL THEN 'EAN'
        WHEN desc_signal IS NOT NULL THEN 'DESCRIPTION'
        WHEN material_signal IS NOT NULL THEN 'MATERIAL'
        WHEN derived_product IS NOT NULL THEN 'TEXT'
        ELSE 'TEXT'
      END
    `;
  }

  private async readNormalizationRows(params: PreviewParams) {
    const safeLimit = this.normalizePositiveInt(params.limit, 50, 500);
    const safeOffset = this.normalizeOffset(params.offset);
    const categoryBucket = this.normalizeBucket(params.categoryBucket);
    const filters: string[] = [];

    if (categoryBucket) {
      filters.push(`${this.buildCategoryBucketCase()} = '${categoryBucket}'`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
      ${this.buildCommonProductsCte()}
      SELECT
        ICOD,
        ean,
        description1,
        description2,
        source_description,
        UPPER(
          TRIM(
            REGEXP_REPLACE(
              SUBSTRING_INDEX(source_description, ' ', 1),
              '[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9-]',
              ''
            )
          )
        ) AS first_word,
        ${this.buildFirstWordProductCase(`
          UPPER(
            TRIM(
              REGEXP_REPLACE(
                SUBSTRING_INDEX(source_description, ' ', 1),
                '[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9-]',
                ''
              )
            )
          )
        `)} AS normalized_first_word_product,
        fam2,
        fam3,
        fam4,
        fam5,
        fam7,
        fam8,
        famc,
        unidad,
        ean_signal,
        desc_signal,
        material_signal,
        derived_product,
        ${this.buildDetectionSourceCase()} AS detection_source,
        ${this.buildCategoryBucketCase()} AS category_bucket
      FROM classified
      ${whereClause}
      ORDER BY ean ASC, ICOD ASC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    return this.queryRows<QueryRow>(sql);
  }

  async getOverview() {
    const totalsSql = `
      ${this.buildCommonProductsCte()}
      SELECT
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN ean <> '' THEN 1 ELSE 0 END) AS withEan,
        SUM(CASE WHEN ean = '' THEN 1 ELSE 0 END) AS withoutEan,
        SUM(CASE WHEN description2 <> '' THEN 1 ELSE 0 END) AS withLongDescription,
        SUM(CASE WHEN description2 = '' THEN 1 ELSE 0 END) AS withoutLongDescription,
        SUM(CASE WHEN fam3 = 'NO ASIGNADO' THEN 1 ELSE 0 END) AS fam3NoAsignado,
        SUM(CASE WHEN fam4 = 'NO ASIGNADO' THEN 1 ELSE 0 END) AS fam4NoAsignado,
        SUM(CASE WHEN fam7 = 'NO ASIGNADO' THEN 1 ELSE 0 END) AS fam7NoAsignado,
        SUM(CASE WHEN fam8 = 'NO ASIGNADO' THEN 1 ELSE 0 END) AS fam8NoAsignado
      FROM classified
    `;

    const categorySql = `
      ${this.buildCommonProductsCte()}
      SELECT
        CASE
          WHEN ean_signal IS NOT NULL THEN ean_signal
          WHEN desc_signal IS NOT NULL THEN desc_signal
          WHEN material_signal IS NOT NULL THEN material_signal
          ELSE 'GENERAL'
        END AS categoryBucket,
        CASE
          WHEN ean_signal IS NOT NULL THEN 'EAN'
          WHEN desc_signal IS NOT NULL THEN 'DESCRIPTION'
          WHEN material_signal IS NOT NULL THEN 'MATERIAL'
          WHEN derived_product IS NOT NULL THEN 'TEXT'
          ELSE 'UNCLASSIFIED'
        END AS classificationSource,
        COUNT(*) AS total
      FROM classified
      GROUP BY categoryBucket, classificationSource
      ORDER BY total DESC
    `;

    const [totals, categoryBuckets] = await Promise.all([
      this.queryRows<QueryRow>(totalsSql),
      this.queryRows<QueryRow>(categorySql),
    ]);

    return {
      totals: totals[0] ?? {},
      categoryBuckets,
    };
  }

  async getFamilyDistribution(top = 15) {
    const safeTop = this.normalizePositiveInt(top, 15, 100);
    const families = [
      { key: 'fam2', label: 'FAM2' },
      { key: 'fam3', label: 'FAM3' },
      { key: 'fam4', label: 'FAM4' },
      { key: 'fam5', label: 'FAM5' },
      { key: 'fam7', label: 'FAM7' },
      { key: 'fam8', label: 'FAM8' },
    ];

    const results = await Promise.all(
      families.map(async ({ key, label }) => {
        const sql = `
          ${this.buildCommonProductsCte()}
          SELECT ${key} AS value, COUNT(*) AS total
          FROM classified
          GROUP BY ${key}
          ORDER BY total DESC, value ASC
          LIMIT ${safeTop}
        `;

        const rows = await this.queryRows<QueryRow>(sql);
        return [label, rows] as const;
      })
    );

    return Object.fromEntries(results);
  }

  async getPrefixPatterns(top = 20) {
    const safeTop = this.normalizePositiveInt(top, 20, 100);
    const byEanPrefix3Sql = `
      ${this.buildCommonProductsCte()}
      SELECT ean_prefix_3 AS prefix, COUNT(*) AS total
      FROM classified
      GROUP BY ean_prefix_3
      ORDER BY total DESC, prefix ASC
      LIMIT ${safeTop}
    `;

    const byEanPrefix1Sql = `
      ${this.buildCommonProductsCte()}
      SELECT ean_prefix_1 AS prefix, COUNT(*) AS total
      FROM classified
      GROUP BY ean_prefix_1
      ORDER BY total DESC, prefix ASC
      LIMIT ${safeTop}
    `;

    const byIcodPrefix2Sql = `
      ${this.buildCommonProductsCte()}
      SELECT icod_prefix_2 AS prefix, COUNT(*) AS total
      FROM classified
      GROUP BY icod_prefix_2
      ORDER BY total DESC, prefix ASC
      LIMIT ${safeTop}
    `;

    const [eanPrefix3, eanPrefix1, icodPrefix2] = await Promise.all([
      this.queryRows<QueryRow>(byEanPrefix3Sql),
      this.queryRows<QueryRow>(byEanPrefix1Sql),
      this.queryRows<QueryRow>(byIcodPrefix2Sql),
    ]);

    return {
      eanPrefix3,
      eanPrefix1,
      icodPrefix2,
    };
  }

  async getFirstWordAnalysis(top = 200) {
    const safeTop = this.normalizePositiveInt(top, 200, 1000);

    const sql = `
      ${this.buildFirstWordProductsCte()}
      SELECT
        first_word,
        normalized_product AS productCandidate,
        analysis_bucket AS analysisBucket,
        COUNT(*) AS total,
        MIN(source_description) AS sampleDescription
      FROM normalized
      GROUP BY first_word, normalized_product, analysis_bucket
      ORDER BY total DESC, first_word ASC
      LIMIT ${safeTop}
    `;

    return this.queryRows<QueryRow>(sql);
  }

  async getFirstWordNormalizationReport(topReview = 50) {
    const safeTopReview = this.normalizePositiveInt(topReview, 50, 200);

    const summarySql = `
      ${this.buildFirstWordProductsCte()}
      SELECT
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN normalized_product <> 'GENERAL' THEN 1 ELSE 0 END) AS normalizedProducts,
        SUM(CASE WHEN normalized_product = 'GENERAL' THEN 1 ELSE 0 END) AS reviewProducts,
        COUNT(DISTINCT first_word) AS distinctFirstWords,
        COUNT(DISTINCT CASE WHEN normalized_product = 'GENERAL' THEN first_word END) AS distinctReviewFirstWords,
        ROUND(
          SUM(CASE WHEN normalized_product <> 'GENERAL' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ) AS normalizedCoveragePct
      FROM normalized
    `;

    const normalizedByProductSql = `
      ${this.buildFirstWordProductsCte()}
      SELECT
        normalized_product AS product,
        COUNT(*) AS total
      FROM normalized
      WHERE normalized_product <> 'GENERAL'
      GROUP BY normalized_product
      ORDER BY total DESC, product ASC
    `;

    const reviewSql = `
      ${this.buildFirstWordProductsCte()}
      SELECT
        first_word,
        COUNT(*) AS total,
        MIN(source_description) AS sampleDescription
      FROM normalized
      WHERE normalized_product = 'GENERAL'
      GROUP BY first_word
      ORDER BY total DESC, first_word ASC
      LIMIT ${safeTopReview}
    `;

    const [summaryRows, normalizedByProduct, reviewTokens] = await Promise.all([
      this.queryRows<QueryRow>(summarySql),
      this.queryRows<QueryRow>(normalizedByProductSql),
      this.queryRows<QueryRow>(reviewSql),
    ]);

    return {
      summary: summaryRows[0] ?? {},
      normalizedByProduct,
      reviewTokens,
    };
  }

  async getCategoryCandidates() {
    const sql = `
      ${this.buildCommonProductsCte()}
      SELECT
        CASE
          WHEN ean_signal IS NOT NULL THEN ean_signal
          WHEN desc_signal IS NOT NULL THEN desc_signal
          WHEN material_signal IS NOT NULL THEN material_signal
          ELSE 'GENERAL'
        END AS categoryBucket,
        CASE
          WHEN ean_signal IS NOT NULL THEN 'EAN'
          WHEN desc_signal IS NOT NULL THEN 'DESCRIPTION'
          WHEN material_signal IS NOT NULL THEN 'MATERIAL'
          WHEN derived_product IS NOT NULL THEN 'TEXT'
          ELSE 'UNCLASSIFIED'
        END AS classificationSource,
        derived_product AS derivedProduct,
        COUNT(*) AS total
      FROM classified
      GROUP BY categoryBucket, classificationSource, derivedProduct
      ORDER BY total DESC, categoryBucket ASC
    `;

    return this.queryRows<QueryRow>(sql);
  }

  async getCategoryConflicts(limit = 100) {
    const safeLimit = this.normalizePositiveInt(limit, 100, 500);
    const sql = `
      ${this.buildCommonProductsCte()}
      SELECT
        ICOD,
        ean,
        source_description,
        fam2,
        fam3,
        fam4,
        fam5,
        fam7,
        fam8,
        ean_signal,
        desc_signal,
        material_signal,
        derived_product,
        CASE
          WHEN ean_signal = 'TUBO_ACERO' AND desc_signal = 'CODO' THEN 'EAN_TUBO_VS_DESC_CODO'
          WHEN ean_signal = 'TUBO_ACERO' AND desc_signal = 'BRIDA' THEN 'EAN_TUBO_VS_DESC_BRIDA'
          WHEN ean_signal = 'VALVULA' AND desc_signal = 'CODO' THEN 'EAN_VALVULA_VS_DESC_CODO'
          WHEN ean_signal = 'VALVULA' AND desc_signal = 'BRIDA' THEN 'EAN_VALVULA_VS_DESC_BRIDA'
          WHEN ean_signal = 'TUBO_ACERO' AND material_signal = 'TUBO_PLASTICO' THEN 'EAN_TUBO_ACERO_VS_MATERIAL_PLASTICO'
          WHEN ean_signal IS NULL AND desc_signal IS NULL AND material_signal IS NULL AND derived_product IS NOT NULL THEN 'SOLO_TEXTO_DETECTA_PRODUCTO'
          WHEN ean_signal IS NULL AND desc_signal IS NULL AND material_signal IS NULL AND derived_product IS NULL THEN 'SIN_SENAL_CLARA'
          ELSE NULL
        END AS conflictReason
      FROM classified
      WHERE
        (ean_signal = 'TUBO_ACERO' AND desc_signal IN ('CODO', 'BRIDA'))
        OR (ean_signal = 'VALVULA' AND desc_signal IN ('CODO', 'BRIDA'))
        OR (ean_signal = 'TUBO_ACERO' AND material_signal = 'TUBO_PLASTICO')
        OR (ean_signal IS NULL AND desc_signal IS NULL AND material_signal IS NULL)
      ORDER BY conflictReason ASC, ean ASC
      LIMIT ${safeLimit}
    `;

    return this.queryRows<QueryRow>(sql);
  }

  async getNormalizationPreview(params: PreviewParams) {
    const rows = await this.readNormalizationRows(params);
    return rows.map((row) => this.mapPreviewRow(row));
  }

  async getNormalizedProductsBatch(params: PreviewParams) {
    const rows = await this.readNormalizationRows(params);
    return rows.map((row) => this.mapNormalizedCatalogRecord(row));
  }

  async getMissingEanBatch(params: PreviewParams) {
    const rows = await this.readNormalizationRows(params);

    return rows
      .map((row) => this.mapNormalizedCatalogRecord(row))
      .filter((record) => !record.source_ean || `${record.source_ean}`.trim() === '')
      .map((record) => ({
        source_icod: record.source_icod,
        source_description: record.source_description,
        detection_bucket: record.detection_bucket,
        detection_source: record.detection_source,
        normalized_product: record.normalized_product,
        manual_review_reason: record.manual_review_reason,
      }));
  }

  private mapPreviewRow(row: QueryRow) {
    const categoryBucket = row.category_bucket;
    const sourceDescription = row.source_description;

    const raw = {
      ICOD: row.ICOD,
      ean: row.ean,
      description1: row.description1,
      description2: row.description2,
      sourceDescription,
      firstWord: row.first_word,
      normalizedFirstWordProduct: row.normalized_first_word_product,
      fam2: row.fam2,
      fam3: row.fam3,
      fam4: row.fam4,
      fam5: row.fam5,
      fam7: row.fam7,
      fam8: row.fam8,
      famc: row.famc,
      unidad: row.unidad,
    };

    if (categoryBucket === 'VALVULA') {
      const diameter = row.fam8 ? cleanDiameter(row.fam8) : '';
      const cedOrSw = ((row.fam7 === 'STD' || row.fam7 === '40') && row.fam7) ?? ((row.fam5 === 'SW') && row.fam5);
      const figura = extraerFiguraDeDescripcion(sourceDescription) ?? '';
      const desc = normalizarDescripcionSWPorCedula(sourceDescription, cedOrSw) ?? sourceDescription;
      const cedulaFinal = row.fam7 && row.fam7.toUpperCase() !== 'NO ASIGNADO' && row.fam7 !== ''
        ? row.fam7.toUpperCase()
        : extraerCedulaDeDescripcion(sourceDescription) ?? '';

      return {
        categoryBucket,
        raw,
        normalized: {
          id: normalizarGrados(row.ean),
          product: 'VALVULA',
          material: row.fam4 ? normalizeValue(row.fam4) : '',
          diameter,
          ced: cedulaFinal,
          termino: row.fam5 === 'NO ASIGNADO' ? '' : row.fam5,
          acabado: row.famc === 'NO ASIGNADO' ? '' : row.famc,
          subtipo: row.fam3 === 'NO ASIGNADO' ? '' : row.fam3,
          figura,
          originalDescription: sourceDescription,
          ean: row.ean,
          description: normalizeValue(`${desc} ${row.fam4 ? normalizeValue(row.fam4) : ''}`.trim()),
        },
      };
    }

    if (categoryBucket === 'CODO') {
      const diameter = row.fam8 ? cleanDiameter(row.fam8) : '';
      const cedOrSw = ((row.fam7 === 'STD' || row.fam7 === '40') && row.fam7) ?? ((row.fam5 === 'SW') && row.fam5);
      const figura = extraerFiguraDeDescripcion(sourceDescription) ?? '';
      const desc = normalizarDescripcionSWPorCedula(sourceDescription, cedOrSw) ?? sourceDescription;
      const { angulo, radio } = extractAnguloRadio(row.fam3 === 'NO ASIGNADO' || !row.fam3 ? sourceDescription : row.fam3) ?? { angulo: '', radio: '' };
      const cedulaFinal = row.fam7 && row.fam7.toUpperCase() !== 'NO ASIGNADO' && row.fam7 !== ''
        ? row.fam7.toUpperCase()
        : extraerCedulaDeDescripcion(sourceDescription) ?? '';

      return {
        categoryBucket,
        raw,
        normalized: {
          id: normalizarGrados(row.ean),
          product: 'CODO',
          material: row.fam4 ? normalizeValue(row.fam4) : '',
          diameter,
          ced: cedulaFinal,
          termino: row.fam5 === 'NO ASIGNADO' ? '' : row.fam5,
          acabado: row.famc === 'NO ASIGNADO' ? '' : row.famc,
          radio: radio ?? '',
          angulo: angulo ?? '',
          figura,
          originalDescription: sourceDescription,
          ean: row.ean,
          description: normalizeValue(`${desc} ${row.fam4 ? normalizeValue(row.fam4) : ''}`.trim()),
        },
      };
    }

    if (categoryBucket === 'BRIDA') {
      return {
        categoryBucket,
        raw,
        normalized: {
          id: row.ean,
          product: 'BRIDA',
          material: row.fam4 ? normalizeValue(row.fam4) : '',
          tipo: quitarPalabraBrida(row.fam3),
          grado: extraerGradoMaterialBrida(sourceDescription) ?? '',
          diameter: row.fam8 === 'NO ASIGNADO' || !row.fam8 ? '' : cleanDiameter(row.fam8),
          presion: extraerPresion(sourceDescription) ?? '',
          ced: row.fam7 === 'NO ASIGNADO' ? '' : row.fam7,
          acabado: row.famc === 'NO ASIGNADO' ? '' : row.famc,
          termino: row.fam5 === 'NO ASIGNADO' ? '' : row.fam5,
          originalDescription: sourceDescription,
          ean: row.ean,
          description: normalizeValue(sourceDescription),
        },
      };
    }

    if (categoryBucket === 'TUBO_ACERO') {
      const ced = row.fam7 === 'NO ASIGNADO' || !row.fam7 ? '' : row.fam7;
      const description = `${normalizarTubo(row.fam2)} de ${row.fam4} (${row.fam3}) (${row.fam8} ${ced}) en ${row.unidad} ${row.fam5 === 'NO ASIGNADO' ? '' : row.fam5} ${row.famc === 'NO ASIGNADO' ? '' : row.famc}`;

      return {
        categoryBucket,
        raw,
        normalized: {
          id: row.ean,
          product: normalizeValue(normalizarTubo(row.fam2)),
          costura: row.fam3 ? normalizeValue(row.fam3) : '',
          material: row.fam4 ? normalizeValue(row.fam4) : '',
          diameter: row.fam8 ?? '',
          ced: row.fam7 ?? '',
          acabado: row.famc ?? '',
          originalDescription: sourceDescription,
          ean: row.ean,
          description: normalizeValue(description),
        },
      };
    }

    if (categoryBucket === 'TUBO_PLASTICO') {
      const ced = verifyData(row.fam7) ?? (extraerCedulaDeDescripcion(sourceDescription) ?? '');
      const term = verifyData(row.fam5) ?? '';
      const description = `${sourceDescription} en ${row.unidad}`;

      return {
        categoryBucket,
        raw,
        normalized: {
          id: row.ean,
          product: 'TUBO',
          tipo: 'PLASTICO',
          costura: '',
          material: row.fam4 ? normalizeValue(row.fam4) : '',
          diameter: row.fam8 === 'NO ASIGNADO' || !row.fam8 ? '' : cleanDiameter(row.fam8),
          termino: term,
          ced,
          originalDescription: sourceDescription,
          ean: row.ean,
          description: normalizeValue(description),
        },
      };
    }

    const detectedProduct = detectProducto(sourceDescription);
    const diameter = row.fam8 ? cleanDiameter(row.fam8) : '';
    const figura = extraerFiguraDeDescripcion(sourceDescription) ?? '';
    const desc = normalizarDescripcionSWPorCedula(sourceDescription, row.fam7) ?? sourceDescription;
    const plasticMaterial = esPlasticoDesdeBD(row.fam4)
      ? detectarMaterialPlastico(sourceDescription) || row.fam4
      : row.fam4;
    const { angulo, radio } = extractAnguloRadio(row.fam3 === 'NO ASIGNADO' || !row.fam3 ? sourceDescription : row.fam3) ?? { angulo: '', radio: '' };
    const costura = buscarCostura(row.fam3 ? normalizeValue(row.fam3) : '') ?? '';

    return {
      categoryBucket,
      raw,
      normalized: {
        id: sanitizeForDB(normalizarGrados(row.ean)),
        product: detectedProduct,
        material: plasticMaterial === 'NO ASIGNADO' ? '' : normalizeValue(plasticMaterial),
        diameter: diameter === 'NO ASIGNADO' ? '' : diameter,
        ced: extraerCedulaDeDescripcion(sourceDescription) ?? '',
        termino: row.fam5 === 'NO ASIGNADO' ? '' : row.fam5,
        acabado: row.famc === 'NO ASIGNADO' ? '' : row.famc,
        subtipo: row.fam3 === 'NO ASIGNADO' ? '' : row.fam3,
        figura,
        radio: radio ?? '',
        angulo: angulo ?? '',
        costura,
        tipo: row.fam2,
        grado: extraerGradoMaterialBrida(sourceDescription) ?? '',
        presion: extraerPresion(sourceDescription) ?? '',
        originalDescription: sourceDescription,
        ean: row.ean,
        description: desc,
      },
    };
  }

  private mapNormalizedCatalogRecord(row: QueryRow) {
    const preview = this.mapPreviewRow(row) as {
      categoryBucket?: string;
      raw?: QueryRow;
      normalized?: QueryRow;
    };
    const normalized: QueryRow = preview.normalized ?? {};
    const raw: QueryRow = preview.raw ?? {};
    const detectionSource = row.detection_source ?? 'TEXT';
    const categoryBucket = preview.categoryBucket ?? 'GENERAL';
    const categoryInfo = this.resolveCategoryInfo(categoryBucket, normalized);
    const reviewReason = this.buildManualReviewReason(categoryBucket, normalized, row);
    const sourceEan = raw.ean ?? '';
    const visual = this.buildVisualAttributes(categoryBucket, normalized, raw);
    const imagePrompt = this.buildImagePrompt(categoryBucket, normalized, raw, categoryInfo, visual);
    const imageNegativePrompt = this.buildImageNegativePrompt();
    const quickSpecs = this.buildQuickSpecs(categoryBucket, normalized, raw);
    const displayName = this.buildDisplayName(normalized, categoryInfo);
    const technicalSummary = this.buildTechnicalSummary(displayName, categoryBucket, normalized, raw, quickSpecs);
    const technicalSpecs = this.buildTechnicalSpecs(normalized, raw, quickSpecs);

    return {
      source_system: 'PROSCAI',
      source_country_code: '01',
      source_icod: raw.ICOD ?? '',
      source_ean: sourceEan,
      source_description1: raw.description1 ?? '',
      source_description2: raw.description2 ?? '',
      source_description: raw.sourceDescription ?? '',
      raw_fam2: raw.fam2 ?? '',
      raw_fam3: raw.fam3 ?? '',
      raw_fam4: raw.fam4 ?? '',
      raw_fam5: raw.fam5 ?? '',
      raw_fam7: raw.fam7 ?? '',
      raw_fam8: raw.fam8 ?? '',
      raw_famc: raw.famc ?? '',
      raw_unidad: raw.unidad ?? '',
      detection_bucket: categoryBucket,
      detection_source: detectionSource,
      detection_first_word: raw.firstWord ?? '',
      detection_first_word_product: raw.normalizedFirstWordProduct ?? '',
      detection_confidence: this.resolveDetectionConfidence(detectionSource, categoryBucket),
      detection_notes: this.buildDetectionNotes(categoryBucket, row, normalized),
      normalized_product: normalized.product ?? 'GENERAL',
      normalized_category: categoryInfo.category,
      normalized_subcategory: categoryInfo.subcategory,
      normalized_material: normalized.material ?? '',
      normalized_tipo: normalized.tipo ?? '',
      normalized_subtipo: normalized.subtipo ?? '',
      normalized_diameter: normalized.diameter ?? '',
      normalized_ced: normalized.ced ?? '',
      normalized_costura: normalized.costura ?? '',
      normalized_termino: normalized.termino ?? '',
      normalized_acabado: normalized.acabado ?? '',
      normalized_radio: normalized.radio ?? '',
      normalized_angulo: normalized.angulo ?? '',
      normalized_presion: normalized.presion ?? '',
      normalized_grado: normalized.grado ?? '',
      normalized_figura: normalized.figura ?? '',
      visual_material: visual.material,
      visual_color: visual.color,
      visual_finish: visual.finish,
      visual_shape: visual.shape,
      visual_connection_type: visual.connectionType,
      visual_special_features: visual.specialFeatures,
      image_prompt: imagePrompt,
      image_negative_prompt: imageNegativePrompt,
      technical_summary: technicalSummary,
      technical_summary_source: 'PIPELINE' as const,
      technical_summary_generated_at: new Date(),
      normalized_norm: quickSpecs.norm,
      normalized_coating: quickSpecs.coating,
      normalized_length: quickSpecs.length,
      display_name: displayName,
      display_description: normalized.description ?? raw.sourceDescription ?? '',
      search_text: this.buildSearchText(normalized, categoryInfo, raw),
      is_active: true,
      is_searchable: true,
      requires_manual_review: Boolean(reviewReason),
      manual_review_reason: reviewReason,
      erp_last_seen_at: null,
      normalized_at: new Date(),
      technical_specs: technicalSpecs,
    };
  }

  private resolveCategoryInfo(categoryBucket: string, normalized: QueryRow) {
    switch (categoryBucket) {
      case 'VALVULA':
        return {
          category: 'VALVULAS',
          subcategory: normalized.subtipo || 'VALVULA',
        };
      case 'TUBO_ACERO':
        return {
          category: 'TUBERIA',
          subcategory: 'TUBO_ACERO',
        };
      case 'TUBO_PLASTICO':
        return {
          category: 'TUBERIA',
          subcategory: 'TUBO_PLASTICO',
        };
      case 'CODO':
        return {
          category: 'CONEXIONES',
          subcategory: 'CODO',
        };
      case 'BRIDA':
        return {
          category: 'CONEXIONES',
          subcategory: normalized.tipo || 'BRIDA',
        };
      default:
        return {
          category: this.resolveGeneralCategory(normalized.product),
          subcategory: normalized.product || 'GENERAL',
        };
    }
  }

  private resolveGeneralCategory(product?: string) {
    switch ((product ?? '').toUpperCase()) {
      case 'TUBO':
        return 'TUBERIA';
      case 'VALVULA':
      case 'LLAVE':
      case 'HIDRANTE':
        return 'VALVULAS';
      case 'CODO':
      case 'BRIDA':
      case 'TEE':
      case 'YEE':
      case 'CRUZ':
      case 'CURVA':
      case 'REDUCCION':
      case 'COPLE':
      case 'NIPLE':
      case 'TAPON':
      case 'ADAPTADOR':
      case 'CONECTOR':
      case 'UNION':
      case 'OLET':
      case 'SWAGE':
      case 'STUB-END':
      case 'MANGUITO':
      case 'CONTRABRIDA':
      case 'INSERTO':
      case 'MONTURA':
        return 'CONEXIONES';
      case 'SOPORTE':
      case 'ESPARRAGO':
      case 'TUERCA':
      case 'TORNILLO':
      case 'ARANDELA':
      case 'BARRA':
      case 'PERFIL':
        return 'SOPORTERIA';
      default:
        return 'ACCESORIOS';
    }
  }

  private resolveDetectionConfidence(detectionSource: string, categoryBucket: string) {
    if (detectionSource === 'EAN') return 0.95;
    if (detectionSource === 'DESCRIPTION') return 0.9;
    if (detectionSource === 'MATERIAL') return 0.85;
    if (categoryBucket !== 'GENERAL') return 0.75;
    return 0.55;
  }

  private buildDetectionNotes(categoryBucket: string, row: QueryRow, normalized: QueryRow) {
    const notes: string[] = [];

    if (categoryBucket === 'TUBO_ACERO' && this.plasticMaterials.includes((row.fam4 ?? '').toUpperCase())) {
      notes.push('FAM4 contradice bucket TUBO_ACERO; revisar material contra descripcion');
    }

    if (categoryBucket === 'TUBO_PLASTICO' && (row.fam4 ?? '').toUpperCase() === 'PLASTICO' && normalized.material) {
      notes.push(`Material inferido desde descripcion: ${normalized.material}`);
    }

    if (!row.ean) {
      notes.push('Producto sin EAN');
    }

    if (categoryBucket === 'GENERAL') {
      notes.push('Bucket GENERAL; requiere reglas adicionales o revision');
    }

    return notes.join(' | ');
  }

  private buildManualReviewReason(categoryBucket: string, normalized: QueryRow, row: QueryRow) {
    if (!row.ean || `${row.ean}`.trim() === '') {
      return 'Falta source_ean en ERP; reportar a sucursal/maestro de productos';
    }

    if (categoryBucket === 'GENERAL') {
      return 'Bucket GENERAL sin clasificacion fuerte';
    }

    if (!normalized.product || normalized.product === 'GENERAL') {
      return 'normalized_product sin valor confiable';
    }

    if (categoryBucket === 'TUBO_ACERO' && this.plasticMaterials.includes((row.fam4 ?? '').toUpperCase())) {
      return 'Conflicto entre bucket de acero y material plastico en ERP';
    }

    return '';
  }

  private buildVisualAttributes(categoryBucket: string, normalized: QueryRow, raw: QueryRow) {
    const material = this.resolveVisualMaterial(normalized.material, normalized.tipo, raw.fam4);
    const color = this.resolveVisualColor(material, normalized.acabado, normalized.description, raw.sourceDescription);
    const finish = this.resolveVisualFinish(normalized.acabado, normalized.material, raw.sourceDescription);
    const shape = this.resolveVisualShape(categoryBucket, normalized);
    const connectionType = this.resolveVisualConnectionType(normalized);
    const specialFeatures = [
      normalized.costura,
      normalized.radio ? `RADIO ${normalized.radio}` : '',
      normalized.angulo ? `${normalized.angulo} DEGREE` : '',
      normalized.ced ? `CEDULA ${normalized.ced}` : '',
      normalized.presion ? `CLASE ${normalized.presion}` : '',
      /ranur/i.test(raw.sourceDescription ?? '') ? 'RANURADO' : '',
      /rosc/i.test(`${normalized.termino ?? ''} ${raw.sourceDescription ?? ''}`) ? 'ROSCADO' : '',
      /bisel/i.test(`${normalized.termino ?? ''} ${raw.sourceDescription ?? ''}`) ? 'BISELADO' : '',
    ]
      .filter((value) => value && value !== 'NO ASIGNADO')
      .join(', ');

    return {
      material,
      color,
      finish,
      shape,
      connectionType,
      specialFeatures,
    };
  }

  private resolveVisualMaterial(material?: string, tipo?: string, rawMaterial?: string) {
    const base = normalizeValue(material || tipo || rawMaterial || '');
    if (/inox/i.test(base)) return 'STAINLESS STEEL';
    if (/acero al carbon/i.test(base) || /carbon/i.test(base)) return 'CARBON STEEL';
    if (/hierro ductil/i.test(base)) return 'DUCTILE IRON';
    if (/galv/i.test(base)) return 'GALVANIZED STEEL';
    if (/cpvc/i.test(base)) return 'CPVC';
    if (/ppr/i.test(base)) return 'PPR';
    if (/hdpe|pead/i.test(base)) return 'HDPE';
    if (/pvc/i.test(base)) return 'PVC';
    if (/plast/i.test(base)) return 'INDUSTRIAL PLASTIC';
    return base || '';
  }

  private resolveVisualColor(material?: string, acabado?: string, description?: string, sourceDescription?: string) {
    const text = normalizeValue(`${material ?? ''} ${acabado ?? ''} ${description ?? ''} ${sourceDescription ?? ''}`);
    if (/stainless/i.test(text) || /inox/i.test(text)) return 'silver metallic';
    if (/galv/i.test(text)) return 'galvanized silver';
    if (/carbon steel|acero al carbon|black steel|negro/i.test(text)) return 'dark gray industrial metallic';
    if (/\bpvc\b/i.test(text)) return 'light gray PVC';
    if (/\bcpvc\b/i.test(text)) return 'beige CPVC';
    if (/\bppr\b/i.test(text)) return 'green PPR';
    if (/hdpe|pead/i.test(text)) return 'black HDPE';
    if (/brass|laton/i.test(text)) return 'brass gold';
    return 'industrial neutral';
  }

  private resolveVisualFinish(acabado?: string, material?: string, sourceDescription?: string) {
    const text = normalizeValue(`${acabado ?? ''} ${material ?? ''} ${sourceDescription ?? ''}`);
    if (/galv/i.test(text)) return 'matte galvanized finish';
    if (/inox|stainless/i.test(text)) return 'brushed metallic finish';
    if (/pulido/i.test(text)) return 'polished finish';
    if (/pintad/i.test(text)) return 'painted industrial finish';
    if (/plast|pvc|cpvc|ppr|hdpe/i.test(text)) return 'matte molded finish';
    return 'matte industrial finish';
  }

  private resolveVisualShape(categoryBucket: string, normalized: QueryRow) {
    if (categoryBucket === 'CODO') {
      return normalizeValue(`ELBOW ${normalized.angulo || ''} ${normalized.radio || ''}`.trim());
    }
    if (categoryBucket === 'BRIDA') {
      return normalizeValue(`FLANGE ${normalized.tipo || ''}`.trim());
    }
    if (categoryBucket === 'VALVULA') {
      return normalizeValue(`VALVE ${normalized.subtipo || ''}`.trim());
    }
    if (categoryBucket === 'TUBO_ACERO' || categoryBucket === 'TUBO_PLASTICO') {
      return 'STRAIGHT PIPE SECTION';
    }
    return normalizeValue(`${normalized.product || ''} ${normalized.subtipo || normalized.tipo || ''}`.trim());
  }

  private resolveVisualConnectionType(normalized: QueryRow) {
    const text = normalizeValue(`${normalized.termino ?? ''} ${normalized.tipo ?? ''} ${normalized.subtipo ?? ''}`);
    if (/sw/.test(text)) return 'socket weld ends';
    if (/bw|bisel/i.test(text)) return 'beveled butt weld ends';
    if (/rosc/i.test(text)) return 'threaded ends';
    if (/bridad/i.test(text)) return 'flanged ends';
    if (/ranur/i.test(text)) return 'grooved ends';
    if (/cement/i.test(text)) return 'solvent weld ends';
    if (/plano/i.test(text)) return 'plain ends';
    return text ? normalizeValue(text) : '';
  }

  private buildImagePrompt(
    categoryBucket: string,
    normalized: QueryRow,
    raw: QueryRow,
    categoryInfo: { category: string; subcategory: string },
    visual: {
      material: string;
      color: string;
      finish: string;
      shape: string;
      connectionType: string;
      specialFeatures: string;
    },
  ) {
    const subject = normalizeValue([
      normalized.product,
      normalized.subtipo,
      normalized.tipo,
      normalized.diameter ? `${normalized.diameter}` : '',
      normalized.ced ? `CEDULA ${normalized.ced}` : '',
    ].filter(Boolean).join(' '));

    const details = [
      `industrial product photo of ${subject || raw.sourceDescription || categoryInfo.subcategory}`,
      visual.shape ? `shape ${visual.shape}` : '',
      visual.material ? `material ${visual.material}` : '',
      visual.color ? `color ${visual.color}` : '',
      visual.finish ? visual.finish : '',
      visual.connectionType ? visual.connectionType : '',
      visual.specialFeatures ? `features ${visual.specialFeatures}` : '',
      normalized.presion ? `pressure rating ${normalized.presion}` : '',
      normalized.grado ? `grade ${normalized.grado}` : '',
      'centered isolated on pure white background',
      'catalog photography style',
      'realistic engineering product render',
      'front three-quarter view',
      'studio lighting',
      'high detail',
      'no branding',
      'no text',
      'single product only',
    ].filter(Boolean);

    return normalizeValue(details.join(', '));
  }

  private buildImageNegativePrompt() {
    return 'people, hands, watermark, logo, text, labels, packaging, box, multiple products, background scene, reflections hiding geometry, blur, low detail, distortion, wrong material, wrong color';
  }

  private buildQuickSpecs(categoryBucket: string, normalized: QueryRow, raw: QueryRow) {
    return {
      norm: this.buildNormalizedNorm(categoryBucket, normalized, raw),
      coating: this.buildNormalizedCoating(normalized, raw),
      length: this.buildNormalizedLength(raw),
    };
  }

  private buildNormalizedNorm(categoryBucket: string, normalized: QueryRow, raw: QueryRow) {
    const text = normalizeValue(`${raw.sourceDescription ?? ''} ${normalized.description ?? ''}`);
    const matches = new Set<string>();

    const patterns: Array<[RegExp, string]> = [
      [/API\s*5L/i, 'API 5L'],
      [/ASTM\s*A53/i, 'ASTM A53'],
      [/ASTM\s*A106/i, 'ASTM A106'],
      [/ASTM\s*A234/i, 'ASTM A234'],
      [/ASTM\s*A105/i, 'ASTM A105'],
      [/ASTM\s*A182/i, 'ASTM A182'],
      [/ASTM\s*A216/i, 'ASTM A216'],
      [/ASME\s*B16\.?\s*5/i, 'ASME B16.5'],
      [/ASME\s*B16\.?\s*9/i, 'ASME B16.9'],
      [/ASME\s*B16\.?\s*11/i, 'ASME B16.11'],
      [/ANSI\s*B36\.?\s*10/i, 'ANSI B36.10'],
      [/ANSI\s*B36\.?\s*19/i, 'ANSI B36.19'],
      [/MSS\s*SP[\s-]*97/i, 'MSS SP-97'],
    ];

    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) {
        matches.add(label);
      }
    }

    if (matches.size === 0 && categoryBucket === 'TUBO_PLASTICO') {
      if (/PPR/i.test(text)) matches.add('PPR');
      if (/CPVC/i.test(text)) matches.add('CPVC');
      if (/\bPVC\b/i.test(text)) matches.add('PVC');
      if (/HDPE|PEAD/i.test(text)) matches.add('HDPE');
    }

    return Array.from(matches).join(' / ');
  }

  private buildNormalizedCoating(normalized: QueryRow, raw: QueryRow) {
    const text = normalizeValue(`${normalized.acabado ?? ''} ${normalized.description ?? ''} ${raw.sourceDescription ?? ''}`);

    if (/FBE|FUSION BONDED EPOXY/i.test(text)) return 'FBE';
    if (/GALV/i.test(text)) return 'GALVANIZADO';
    if (/EP(OXI|OXY)|EPOX/i.test(text)) return 'RECUBRIMIENTO EPOXICO';
    if (/PINTAD/i.test(text)) return 'PINTURA INDUSTRIAL';
    if (/NEGRO/i.test(text)) return 'NEGRO';

    return normalizeValue(normalized.acabado ?? '');
  }

  private buildNormalizedLength(raw: QueryRow) {
    const text = normalizeValue(raw.sourceDescription ?? '');

    if (/DOBLE ALEATORIA|\bDRL\b/i.test(text)) return 'DOBLE ALEATORIA (DRL)';
    if (/SIMPLE ALEATORIA|\bSRL\b/i.test(text)) return 'SIMPLE ALEATORIA (SRL)';
    if (/\b12\s*M(TRO|ETRO|)\b/i.test(text)) return '12 M';
    if (/\b6\s*M(TRO|ETRO|)\b/i.test(text)) return '6 M';
    if (/EN METRO/i.test(text) || /METRO/.test(normalizeValue(raw.unidad ?? ''))) return 'EN METRO';

    return '';
  }

  private buildTechnicalSummary(
    displayName: string,
    categoryBucket: string,
    normalized: QueryRow,
    raw: QueryRow,
    quickSpecs: { norm: string; coating: string; length: string },
  ) {
    const subject = displayName || normalizeValue(raw.sourceDescription ?? '') || 'Producto industrial';
    const coreDetails = [
      normalized.material ? `material ${normalized.material}` : '',
      normalized.diameter ? `diametro ${normalized.diameter}` : '',
      normalized.ced ? `cedula ${normalized.ced}` : '',
      normalized.costura ? normalizeValue(normalized.costura) : '',
      normalized.radio ? `radio ${normalized.radio}` : '',
      normalized.angulo ? `${normalized.angulo} grados` : '',
      normalized.termino ? `terminacion ${normalized.termino}` : '',
    ].filter(Boolean);

    const firstSentence = normalizeValue([
      subject,
      coreDetails.length > 0 ? `con ${coreDetails.join(', ')}` : '',
    ].filter(Boolean).join(' '));

    const secondParts = [
      quickSpecs.coating ? `recubrimiento ${quickSpecs.coating}` : '',
      quickSpecs.length ? `longitud comercial ${quickSpecs.length}` : '',
      quickSpecs.norm ? `norma ${quickSpecs.norm}` : '',
      categoryBucket === 'TUBO_ACERO' ? 'orientado a conduccion industrial' : '',
      categoryBucket === 'VALVULA' ? 'pensado para control de flujo industrial' : '',
      categoryBucket === 'CODO' ? 'util para cambios de direccion en linea' : '',
    ].filter(Boolean);

    const secondSentence = secondParts.length > 0 ? normalizeValue(secondParts.join(', ')) : '';

    return [firstSentence, secondSentence]
      .filter(Boolean)
      .map((sentence) => sentence.endsWith('.') ? sentence : `${sentence}.`)
      .join(' ');
  }

  private buildTechnicalSpecs(
    normalized: QueryRow,
    raw: QueryRow,
    quickSpecs: { norm: string; coating: string; length: string },
  ): TechnicalSpecRecord[] {
    const rows: TechnicalSpecRecord[] = [];

    const pushSpec = (label: string, value?: string, standard?: string) => {
      const cleanValue = normalizeValue(value ?? '');
      const cleanStandard = normalizeValue(standard ?? '');

      if (!cleanValue || cleanValue === 'NO ASIGNADO') {
        return;
      }

      rows.push({
        label,
        value: cleanValue,
        standard: cleanStandard || undefined,
        sort_order: rows.length + 1,
      });
    };

    pushSpec('Material', normalized.material);
    pushSpec('Diametro Nominal', normalized.diameter);
    pushSpec('Cedula / Espesor', normalized.ced, quickSpecs.norm);
    pushSpec('Tipo de Fabricacion', normalized.costura);
    pushSpec('Tipo', normalized.tipo);
    pushSpec('Subtipo', normalized.subtipo);
    pushSpec('Terminacion', normalized.termino);
    pushSpec('Acabado', normalized.acabado);
    pushSpec('Recubrimiento', quickSpecs.coating);
    pushSpec('Radio', normalized.radio);
    pushSpec('Angulo', normalized.angulo ? `${normalized.angulo} GRADOS` : '');
    pushSpec('Presion / Clase', normalized.presion);
    pushSpec('Grado', normalized.grado);
    pushSpec('Figura', normalized.figura);
    pushSpec('Longitud Comercial', quickSpecs.length);
    pushSpec('Unidad Comercial', raw.unidad);
    pushSpec('Norma', quickSpecs.norm);

    return rows;
  }

  private buildDisplayName(normalized: QueryRow, categoryInfo: { category: string; subcategory: string }) {
    const parts = [
      normalized.product,
      normalized.subtipo,
      normalized.tipo,
      normalized.material,
      normalized.diameter,
    ].filter((value) => value && value !== 'NO ASIGNADO');

    if (parts.length > 0) {
      return normalizeValue(parts.join(' '));
    }

    return normalizeValue(`${categoryInfo.subcategory} ${normalized.material ?? ''}`.trim());
  }

  private buildSearchText(normalized: QueryRow, categoryInfo: { category: string; subcategory: string }, raw: QueryRow) {
    const tokens = [
      normalized.description,
      normalized.originalDescription,
      normalized.product,
      categoryInfo.category,
      categoryInfo.subcategory,
      normalized.material,
      normalized.tipo,
      normalized.subtipo,
      normalized.diameter,
      normalized.ced,
      normalized.costura,
      normalized.radio,
      normalized.angulo,
      normalized.presion,
      normalized.grado,
      raw.fam2,
      raw.fam3,
      raw.fam4,
      raw.fam5,
      raw.fam7,
      raw.fam8,
    ]
      .filter((value) => value && value !== 'NO ASIGNADO')
      .join(' ');

    return normalizeValue(tokens);
  }
}
