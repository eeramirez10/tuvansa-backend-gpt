import mysql from "mysql2/promise";
import { envs } from "../../config/envs";

export type ProscaiCatalogScope =
  | "ALL"
  | "TUBERIA"
  | "TUBO_ACERO"
  | "TUBO_PLASTICO";

export interface ProscaiCatalogCursor {
  ean: string;
  icod: string;
}

export interface ProscaiCatalogSourceRow {
  ean: string;
  icod: string;
  description1: string;
  description2: string;
  fam2: string;
  fam3: string;
  fam4: string;
  fam5: string;
  fam7: string;
  fam8: string;
  famc: string;
  unit: string;
}

export interface ProscaiCatalogPage {
  items: ProscaiCatalogSourceRow[];
  nextCursor?: ProscaiCatalogCursor;
}

export class ProscaiCatalogDatasource {
  private readonly pool = mysql.createPool({
    host: envs.URL_MYSQL,
    user: envs.USER_MYSQL,
    password: envs.PASSWORD_MYSQL,
    database: envs.DB_MYSQL,
  });

  public async findPage(
    cursor: ProscaiCatalogCursor | undefined,
    limit: number,
    scope: ProscaiCatalogScope = "ALL",
  ): Promise<ProscaiCatalogPage> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
    const afterEan = cursor?.ean ?? "";
    const afterIcod = cursor?.icod ?? "";
    const scopeClause = this.buildScopeClause(scope);

    const [rows] = await this.pool.query(
      `
        WITH deduplicated_inventory AS (
          SELECT
            ISEQ,
            ROW_NUMBER() OVER (
              PARTITION BY UPPER(TRIM(IEAN))
              ORDER BY ICOD ASC
            ) AS ean_rank
          FROM FINV
          WHERE ITIPO = 1
            AND LEFT(ICOD, 1) <> 'Z'
            AND TRIM(COALESCE(IEAN, '')) <> ''
        )
        SELECT
          TRIM(FINV.IEAN) AS ean,
          FINV.ICOD AS icod,
          COALESCE(FINV.IDESCR, '') AS description1,
          COALESCE(FINV2.I2DESCR, '') AS description2,
          COALESCE(FAM2.FAMDESCR, '') AS fam2,
          COALESCE(FAM3.FAMDESCR, '') AS fam3,
          COALESCE(FAM4.FAMDESCR, '') AS fam4,
          COALESCE(FAM5.FAMDESCR, '') AS fam5,
          COALESCE(FAM7.FAMDESCR, '') AS fam7,
          COALESCE(FAM8.FAMDESCR, '') AS fam8,
          COALESCE(FAMC.FAMDESCR, '') AS famc,
          COALESCE(FUNIDAD.UDESCR, '') AS unit
        FROM FINV
        INNER JOIN deduplicated_inventory
          ON deduplicated_inventory.ISEQ = FINV.ISEQ
          AND deduplicated_inventory.ean_rank = 1
        LEFT JOIN (
          SELECT I2KEY, MAX(I2DESCR) AS I2DESCR
          FROM FINV2
          GROUP BY I2KEY
        ) AS FINV2 ON FINV2.I2KEY = FINV.ISEQ
        LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM = FINV.IFAM2
        LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM = FINV.IFAM3
        LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM = FINV.IFAM4
        LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM = FINV.IFAM5
        LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM = FINV.IFAM7
        LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM = FINV.IFAM8
        LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM = FINV.IFAMC
        LEFT JOIN FUNIDAD ON FUNIDAD.UCOD = FINV.IUM
        WHERE TRIM(COALESCE(NULLIF(FINV2.I2DESCR, ''), FINV.IDESCR, '')) <> ''
          ${scopeClause}
          AND (
            TRIM(FINV.IEAN) > ?
            OR (TRIM(FINV.IEAN) = ? AND FINV.ICOD > ?)
          )
        ORDER BY TRIM(FINV.IEAN) ASC, FINV.ICOD ASC
        LIMIT ?
      `,
      [afterEan, afterEan, afterIcod, safeLimit],
    );

    const items = rows as ProscaiCatalogSourceRow[];
    const lastItem = items[items.length - 1];

    return {
      items,
      nextCursor:
        items.length === safeLimit && lastItem
          ? { ean: lastItem.ean, icod: lastItem.icod }
          : undefined,
    };
  }

  public async findByEan(ean: string): Promise<ProscaiCatalogSourceRow | null> {
    const normalizedEan = ean.trim();
    if (!normalizedEan) return null;

    const [rows] = await this.pool.query(
      `
        SELECT
          TRIM(FINV.IEAN) AS ean,
          FINV.ICOD AS icod,
          COALESCE(FINV.IDESCR, '') AS description1,
          COALESCE(FINV2.I2DESCR, '') AS description2,
          COALESCE(FAM2.FAMDESCR, '') AS fam2,
          COALESCE(FAM3.FAMDESCR, '') AS fam3,
          COALESCE(FAM4.FAMDESCR, '') AS fam4,
          COALESCE(FAM5.FAMDESCR, '') AS fam5,
          COALESCE(FAM7.FAMDESCR, '') AS fam7,
          COALESCE(FAM8.FAMDESCR, '') AS fam8,
          COALESCE(FAMC.FAMDESCR, '') AS famc,
          COALESCE(FUNIDAD.UDESCR, '') AS unit
        FROM FINV
        LEFT JOIN (
          SELECT I2KEY, MAX(I2DESCR) AS I2DESCR
          FROM FINV2
          GROUP BY I2KEY
        ) AS FINV2 ON FINV2.I2KEY = FINV.ISEQ
        LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM = FINV.IFAM2
        LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM = FINV.IFAM3
        LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM = FINV.IFAM4
        LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM = FINV.IFAM5
        LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM = FINV.IFAM7
        LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM = FINV.IFAM8
        LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM = FINV.IFAMC
        LEFT JOIN FUNIDAD ON FUNIDAD.UCOD = FINV.IUM
        WHERE FINV.ITIPO = 1
          AND LEFT(FINV.ICOD, 1) <> 'Z'
          AND UPPER(TRIM(FINV.IEAN)) = UPPER(TRIM(?))
          AND TRIM(COALESCE(NULLIF(FINV2.I2DESCR, ''), FINV.IDESCR, '')) <> ''
        ORDER BY FINV.ICOD ASC
        LIMIT 1
      `,
      [normalizedEan],
    );

    const items = rows as ProscaiCatalogSourceRow[];
    return items[0] ?? null;
  }

  private buildScopeClause(scope: ProscaiCatalogScope): string {
    const steelPipeClause = "(FINV.IEAN LIKE 'TSC%' OR FINV.IEAN LIKE 'TCC%')";
    const plasticPipeClause = `(
      UPPER(TRIM(COALESCE(NULLIF(FINV2.I2DESCR, ''), FINV.IDESCR, ''))) LIKE 'TUB%'
      AND UPPER(COALESCE(FAM4.FAMDESCR, '')) IN ('HDPE', 'PVC', 'PLASTICO', 'CPVC', 'PPR')
    )`;

    switch (scope) {
      case "TUBO_ACERO":
        return `AND ${steelPipeClause}`;
      case "TUBO_PLASTICO":
        return `AND ${plasticPipeClause}`;
      case "TUBERIA":
        return `AND (${steelPipeClause} OR ${plasticPipeClause})`;
      case "ALL":
      default:
        return "";
    }
  }
}
