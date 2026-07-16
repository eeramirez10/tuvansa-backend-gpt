import mysql from "mysql2/promise";

import { envs } from "../../config/envs";

type QueryRow = Record<string, any>;

export const INVENTORY_BRANCHES = {
  "01": "MEXICO",
  "02": "MONTERREY",
  "03": "VERACRUZ",
  "04": "MEXICALI",
  "05": "QUERETARO",
  "06": "CANCUN",
  "07": "LOS CABOS",
} as const;

export type InventoryBranchCode = keyof typeof INVENTORY_BRANCHES;

export const INVENTORY_ISSUE_METRICS = [
  "WITHOUT_EAN",
  "WITHOUT_LONG_DESCRIPTION",
  "MULTIPLE_RECORD_EAN",
  "DUPLICATE_EAN_IN_BRANCH",
  "DESCRIPTION_CONFLICT",
  "CRITICAL_CONFLICT",
  "FAMILY2_CONFLICT",
  "PRODUCT_TYPE_CONFLICT",
  "MATERIAL_CONFLICT",
  "TERMINATION_CONFLICT",
  "SCHEDULE_CONFLICT",
  "DIAMETER_CONFLICT",
  "UNIT_CONFLICT",
  "MISSING_FAMILY2",
  "MISSING_PRODUCT_TYPE",
  "MISSING_MATERIAL",
  "MISSING_SCHEDULE",
  "MISSING_DIAMETER",
  "INACTIVE",
  "OBSOLETE",
  "VERY_SHORT_DESCRIPTION",
] as const;

export type InventoryIssueMetric = typeof INVENTORY_ISSUE_METRICS[number];

type IssueParams = {
  metric: InventoryIssueMetric;
  branchCode?: InventoryBranchCode;
  limit: number;
  offset: number;
};

export class ProscaiInventoryQualityReportService {
  private readonly pool = mysql.createPool({
    host: envs.URL_MYSQL,
    user: envs.USER_MYSQL,
    password: envs.PASSWORD_MYSQL,
    database: envs.DB_MYSQL,
  });

  public async getReport(distributionTop = 20) {
    const safeTop = Math.min(Math.max(Math.floor(distributionTop), 1), 50);
    const [globalRows, branchRows, distributionRows] = await Promise.all([
      this.queryRows(this.buildGlobalReportSql()),
      this.queryRows(this.buildBranchReportSql()),
      this.queryRows(this.buildDistributionSql(), [safeTop]),
    ]);

    const distributionsByScope = this.groupDistributions(distributionRows);
    const global = this.normalizeMetrics(globalRows[0] ?? {});
    const branches = branchRows.map((row) => {
      const normalized = this.normalizeMetrics(row);
      const branchCode = String(row.branchCode) as InventoryBranchCode;

      return {
        ...normalized,
        branchCode,
        branchName: INVENTORY_BRANCHES[branchCode],
        distributions: distributionsByScope.get(branchCode) ?? {},
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        productType: 1,
        excludedIcodPrefixes: ["Z"],
        includedBranches: Object.entries(INVENTORY_BRANCHES).map(([code, name]) => ({ code, name })),
      },
      metricUnits: {
        sourceRows: "registros",
        uniqueEans: "EAN distintos",
        missingFields: "registros",
        conflicts: "EAN afectados",
        duplicateEanInBranchGroups: "combinaciones EAN-sucursal afectadas",
      },
      supportedIssueMetrics: INVENTORY_ISSUE_METRICS,
      global: {
        ...global,
        distributions: distributionsByScope.get("ALL") ?? {},
      },
      branches,
    };
  }

  public async getIssues(params: IssueParams) {
    if (this.isRowMetric(params.metric)) {
      return this.getRowIssues(params);
    }

    if (params.metric === "DUPLICATE_EAN_IN_BRANCH") {
      return this.getDuplicateInBranchIssues(params);
    }

    return this.getConflictIssues(params);
  }

  private async getRowIssues(params: IssueParams) {
    const condition = this.getRowMetricCondition(params.metric);
    const branchCondition = params.branchCode ? "AND raw.branchCode = ?" : "";
    const branchValues = params.branchCode ? [params.branchCode] : [];
    const countSql = `
      ${this.buildRawProductsCte()}
      SELECT COUNT(*) AS total
      FROM raw
      WHERE ${condition}
        ${branchCondition}
    `;
    const detailSql = `
      ${this.buildRawProductsCte()}
      SELECT ${this.getRecordColumns()}
      FROM raw
      WHERE ${condition}
        ${branchCondition}
      ORDER BY branchCode ASC, icod ASC
      LIMIT ? OFFSET ?
    `;
    const [countRows, items] = await Promise.all([
      this.queryRows(countSql, branchValues),
      this.queryRows(detailSql, [...branchValues, params.limit, params.offset]),
    ]);

    return this.buildIssueResponse(
      params,
      Number(countRows[0]?.total ?? 0),
      items.map((item) => this.enrichRecord(item)),
    );
  }

  private async getDuplicateInBranchIssues(params: IssueParams) {
    const branchCondition = params.branchCode ? "AND branchCode = ?" : "";
    const branchValues = params.branchCode ? [params.branchCode] : [];
    const targetsSql = `
      ${this.buildRawProductsCte()}
      SELECT ean, branchCode, COUNT(*) AS copies
      FROM raw
      WHERE ean IS NOT NULL
        ${branchCondition}
      GROUP BY ean, branchCode
      HAVING COUNT(*) > 1
      ORDER BY branchCode ASC, ean ASC
      LIMIT ? OFFSET ?
    `;
    const countSql = `
      ${this.buildRawProductsCte()}
      SELECT COUNT(*) AS total
      FROM (
        SELECT ean, branchCode
        FROM raw
        WHERE ean IS NOT NULL
          ${branchCondition}
        GROUP BY ean, branchCode
        HAVING COUNT(*) > 1
      ) duplicated
    `;
    const [countRows, targets] = await Promise.all([
      this.queryRows(countSql, branchValues),
      this.queryRows(targetsSql, [...branchValues, params.limit, params.offset]),
    ]);

    if (targets.length === 0) {
      return this.buildIssueResponse(params, Number(countRows[0]?.total ?? 0), []);
    }

    const targetKeys = new Set(targets.map((row) => `${row.ean}|${row.branchCode}`));
    const eans = Array.from(new Set(targets.map((row) => String(row.ean))));
    const records = await this.findRecordsByEans(eans);
    const recordsByKey = new Map<string, QueryRow[]>();

    for (const record of records) {
      const key = `${record.ean}|${record.branchCode}`;
      if (!targetKeys.has(key)) continue;
      const grouped = recordsByKey.get(key) ?? [];
      grouped.push(record);
      recordsByKey.set(key, grouped);
    }

    const items = targets.map((target) => ({
      ean: target.ean,
      branchCode: target.branchCode,
      branchName: INVENTORY_BRANCHES[target.branchCode as InventoryBranchCode],
      copies: Number(target.copies),
      records: recordsByKey.get(`${target.ean}|${target.branchCode}`) ?? [],
    }));

    return this.buildIssueResponse(params, Number(countRows[0]?.total ?? 0), items);
  }

  private async getConflictIssues(params: IssueParams) {
    const condition = this.getConflictMetricCondition(params.metric);
    const branchFilter = params.branchCode
      ? "AND EXISTS (SELECT 1 FROM raw branch_record WHERE branch_record.ean = conflicts.ean AND branch_record.branchCode = ?)"
      : "";
    const branchValues = params.branchCode ? [params.branchCode] : [];
    const countSql = `
      ${this.buildRawProductsCte()},
      ${this.buildConflictsCte()}
      SELECT COUNT(*) AS total
      FROM conflicts
      WHERE ${condition}
        ${branchFilter}
    `;
    const targetsSql = `
      ${this.buildRawProductsCte()},
      ${this.buildConflictsCte()}
      SELECT *
      FROM conflicts
      WHERE ${condition}
        ${branchFilter}
      ORDER BY ean ASC
      LIMIT ? OFFSET ?
    `;
    const [countRows, targets] = await Promise.all([
      this.queryRows(countSql, branchValues),
      this.queryRows(targetsSql, [...branchValues, params.limit, params.offset]),
    ]);

    if (targets.length === 0) {
      return this.buildIssueResponse(params, Number(countRows[0]?.total ?? 0), []);
    }

    const records = await this.findRecordsByEans(targets.map((target) => String(target.ean)));
    const recordsByEan = new Map<string, QueryRow[]>();
    for (const record of records) {
      const grouped = recordsByEan.get(record.ean) ?? [];
      grouped.push(record);
      recordsByEan.set(record.ean, grouped);
    }

    const items = targets.map((target) => ({
      ean: target.ean,
      conflictMetrics: this.readConflictMetrics(target),
      records: recordsByEan.get(target.ean) ?? [],
    }));

    return this.buildIssueResponse(params, Number(countRows[0]?.total ?? 0), items);
  }

  private buildIssueResponse(params: IssueParams, total: number, items: QueryRow[]) {
    return {
      metric: params.metric,
      branchCode: params.branchCode ?? null,
      branchName: params.branchCode ? INVENTORY_BRANCHES[params.branchCode] : "TODAS",
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total,
        hasMore: params.offset + items.length < total,
      },
      items,
    };
  }

  private async findRecordsByEans(eans: string[]) {
    const placeholders = eans.map(() => "?").join(", ");
    const sql = `
      ${this.buildRawProductsCte()}
      SELECT ${this.getRecordColumns()}
      FROM raw
      WHERE ean IN (${placeholders})
      ORDER BY ean ASC, branchCode ASC, icod ASC
    `;

    const records = await this.queryRows(sql, eans);
    return records.map((record) => this.enrichRecord(record));
  }

  private buildGlobalReportSql(): string {
    return `
      ${this.buildRawProductsCte()},
      ${this.buildConflictsCte()},
      duplicate_in_branch AS (
        SELECT ean, branchCode
        FROM raw
        WHERE ean IS NOT NULL
        GROUP BY ean, branchCode
        HAVING COUNT(*) > 1
      )
      SELECT
        COUNT(*) AS sourceRows,
        COUNT(DISTINCT ean) AS uniqueEans,
        SUM(ean IS NULL) AS withoutEanRows,
        SUM(description2 IS NOT NULL) AS withLongDescriptionRows,
        SUM(description2 IS NULL) AS withoutLongDescriptionRows,
        SUM(isInactive = 1) AS inactiveRows,
        SUM(UPPER(description) LIKE '%OBSOLETO%') AS obsoleteRows,
        SUM(CHAR_LENGTH(TRIM(description)) < 12) AS veryShortDescriptionRows,
        SUM(${this.getMissingCondition("fam2Code", "fam2")}) AS missingFamily2Rows,
        SUM(${this.getMissingCondition("fam3Code", "fam3")}) AS missingProductTypeRows,
        SUM(${this.getMissingCondition("fam4Code", "fam4")}) AS missingMaterialRows,
        SUM(${this.getMissingCondition("fam7Code", "fam7")}) AS missingScheduleRows,
        SUM(${this.getMissingCondition("fam8Code", "fam8")}) AS missingDiameterRows,
        (SELECT COUNT(*) FROM conflicts WHERE copies > 1) AS multipleRecordEans,
        (SELECT COUNT(DISTINCT ean) FROM duplicate_in_branch) AS duplicateEansInBranch,
        (SELECT COUNT(*) FROM duplicate_in_branch) AS duplicateEanInBranchGroups,
        (SELECT COUNT(*) FROM conflicts WHERE descriptionVariants > 1) AS descriptionConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE family2Variants > 1) AS family2ConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE productTypeVariants > 1) AS productTypeConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE materialVariants > 1) AS materialConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE terminationVariants > 1) AS terminationConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE scheduleVariants > 1) AS scheduleConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE diameterVariants > 1) AS diameterConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE unitVariants > 1) AS unitConflictEans,
        (SELECT COUNT(*) FROM conflicts WHERE ${this.getConflictMetricCondition("CRITICAL_CONFLICT")}) AS criticalConflictEans
      FROM raw
    `;
  }

  private buildBranchReportSql(): string {
    return `
      ${this.buildRawProductsCte()},
      ${this.buildConflictsCte()},
      duplicate_in_branch AS (
        SELECT ean, branchCode
        FROM raw
        WHERE ean IS NOT NULL
        GROUP BY ean, branchCode
        HAVING COUNT(*) > 1
      )
      SELECT
        raw.branchCode,
        COUNT(*) AS sourceRows,
        COUNT(DISTINCT raw.ean) AS uniqueEans,
        SUM(raw.ean IS NULL) AS withoutEanRows,
        SUM(raw.description2 IS NOT NULL) AS withLongDescriptionRows,
        SUM(raw.description2 IS NULL) AS withoutLongDescriptionRows,
        SUM(raw.isInactive = 1) AS inactiveRows,
        SUM(UPPER(raw.description) LIKE '%OBSOLETO%') AS obsoleteRows,
        SUM(CHAR_LENGTH(TRIM(raw.description)) < 12) AS veryShortDescriptionRows,
        SUM(${this.getMissingCondition("raw.fam2Code", "raw.fam2")}) AS missingFamily2Rows,
        SUM(${this.getMissingCondition("raw.fam3Code", "raw.fam3")}) AS missingProductTypeRows,
        SUM(${this.getMissingCondition("raw.fam4Code", "raw.fam4")}) AS missingMaterialRows,
        SUM(${this.getMissingCondition("raw.fam7Code", "raw.fam7")}) AS missingScheduleRows,
        SUM(${this.getMissingCondition("raw.fam8Code", "raw.fam8")}) AS missingDiameterRows,
        COUNT(DISTINCT CASE WHEN conflicts.copies > 1 THEN raw.ean END) AS multipleRecordEans,
        COUNT(DISTINCT duplicate_in_branch.ean) AS duplicateEansInBranch,
        COUNT(DISTINCT CASE WHEN conflicts.descriptionVariants > 1 THEN raw.ean END) AS descriptionConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.family2Variants > 1 THEN raw.ean END) AS family2ConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.productTypeVariants > 1 THEN raw.ean END) AS productTypeConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.materialVariants > 1 THEN raw.ean END) AS materialConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.terminationVariants > 1 THEN raw.ean END) AS terminationConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.scheduleVariants > 1 THEN raw.ean END) AS scheduleConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.diameterVariants > 1 THEN raw.ean END) AS diameterConflictEans,
        COUNT(DISTINCT CASE WHEN conflicts.unitVariants > 1 THEN raw.ean END) AS unitConflictEans,
        COUNT(DISTINCT CASE WHEN ${this.getConflictMetricCondition("CRITICAL_CONFLICT", "conflicts")} THEN raw.ean END) AS criticalConflictEans
      FROM raw
      LEFT JOIN conflicts ON conflicts.ean = raw.ean
      LEFT JOIN duplicate_in_branch
        ON duplicate_in_branch.ean = raw.ean
        AND duplicate_in_branch.branchCode = raw.branchCode
      GROUP BY raw.branchCode
      ORDER BY raw.branchCode ASC
    `;
  }

  private buildDistributionSql(): string {
    return `
      ${this.buildRawProductsCte()},
      distributions AS (
        SELECT 'ALL' AS scopeCode, 'FAMILY2' AS dimension, COALESCE(NULLIF(fam2, ''), 'SIN ASIGNAR') AS value, COUNT(*) AS total FROM raw GROUP BY value
        UNION ALL
        SELECT 'ALL', 'PRODUCT_TYPE', COALESCE(NULLIF(fam3, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY COALESCE(NULLIF(fam3, ''), 'SIN ASIGNAR')
        UNION ALL
        SELECT 'ALL', 'MATERIAL', COALESCE(NULLIF(fam4, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY COALESCE(NULLIF(fam4, ''), 'SIN ASIGNAR')
        UNION ALL
        SELECT 'ALL', 'UNIT', COALESCE(NULLIF(unit, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY COALESCE(NULLIF(unit, ''), 'SIN ASIGNAR')
        UNION ALL
        SELECT branchCode, 'FAMILY2', COALESCE(NULLIF(fam2, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY branchCode, COALESCE(NULLIF(fam2, ''), 'SIN ASIGNAR')
        UNION ALL
        SELECT branchCode, 'PRODUCT_TYPE', COALESCE(NULLIF(fam3, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY branchCode, COALESCE(NULLIF(fam3, ''), 'SIN ASIGNAR')
        UNION ALL
        SELECT branchCode, 'MATERIAL', COALESCE(NULLIF(fam4, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY branchCode, COALESCE(NULLIF(fam4, ''), 'SIN ASIGNAR')
        UNION ALL
        SELECT branchCode, 'UNIT', COALESCE(NULLIF(unit, ''), 'SIN ASIGNAR'), COUNT(*) FROM raw GROUP BY branchCode, COALESCE(NULLIF(unit, ''), 'SIN ASIGNAR')
      ),
      ranked AS (
        SELECT distributions.*, ROW_NUMBER() OVER (PARTITION BY scopeCode, dimension ORDER BY total DESC, value ASC) AS position
        FROM distributions
      )
      SELECT scopeCode, dimension, value, total
      FROM ranked
      WHERE position <= ?
      ORDER BY scopeCode ASC, dimension ASC, total DESC, value ASC
    `;
  }

  private buildRawProductsCte(): string {
    return `
      WITH long_descriptions AS (
        SELECT I2KEY, MAX(NULLIF(TRIM(I2DESCR), '')) AS description2
        FROM FINV2
        GROUP BY I2KEY
      ),
      raw AS (
        SELECT
          FINV.ISEQ AS iseq,
          FINV.ICOD AS icod,
          LEFT(FINV.ICOD, 2) AS branchCode,
          NULLIF(UPPER(TRIM(FINV.IEAN)), '') AS ean,
          TRIM(FINV.IDESCR) AS description1,
          long_descriptions.description2,
          COALESCE(long_descriptions.description2, TRIM(FINV.IDESCR)) AS description,
          TRIM(FINV.IFAM2) AS fam2Code,
          TRIM(FINV.IFAM3) AS fam3Code,
          TRIM(FINV.IFAM4) AS fam4Code,
          TRIM(FINV.IFAM5) AS fam5Code,
          TRIM(FINV.IFAM7) AS fam7Code,
          TRIM(FINV.IFAM8) AS fam8Code,
          COALESCE(FAM2.FAMDESCR, '') AS fam2,
          COALESCE(FAM3.FAMDESCR, '') AS fam3,
          COALESCE(FAM4.FAMDESCR, '') AS fam4,
          COALESCE(FAM5.FAMDESCR, '') AS fam5,
          COALESCE(FAM7.FAMDESCR, '') AS fam7,
          COALESCE(FAM8.FAMDESCR, '') AS fam8,
          FINV.IUM AS unitCode,
          COALESCE(FUNIDAD.UDESCR, '') AS unit,
          FINV.IINACTIVO AS isInactive,
          FINV.IALTA AS createdAt,
          FINV.IFECHACAMBIO AS sourceUpdatedAt,
          FINV.IBAJA AS disabledAt
        FROM FINV
        LEFT JOIN long_descriptions ON long_descriptions.I2KEY = FINV.ISEQ
        LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM = FINV.IFAM2
        LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM = FINV.IFAM3
        LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM = FINV.IFAM4
        LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM = FINV.IFAM5
        LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM = FINV.IFAM7
        LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM = FINV.IFAM8
        LEFT JOIN FUNIDAD ON FUNIDAD.UCOD = FINV.IUM
        WHERE FINV.ITIPO = 1
          AND LEFT(FINV.ICOD, 2) IN ('01', '02', '03', '04', '05', '06', '07')
      )
    `;
  }

  private buildConflictsCte(): string {
    return `conflicts AS (
      SELECT
        ean,
        COUNT(*) AS copies,
        COUNT(DISTINCT branchCode) AS branches,
        COUNT(DISTINCT NULLIF(UPPER(TRIM(description)), '')) AS descriptionVariants,
        COUNT(DISTINCT ${this.getMeaningfulValue("fam2")}) AS family2Variants,
        COUNT(DISTINCT ${this.getMeaningfulValue("fam3")}) AS productTypeVariants,
        COUNT(DISTINCT ${this.getMeaningfulValue("fam4")}) AS materialVariants,
        COUNT(DISTINCT ${this.getMeaningfulValue("fam5")}) AS terminationVariants,
        COUNT(DISTINCT ${this.getMeaningfulValue("fam7")}) AS scheduleVariants,
        COUNT(DISTINCT ${this.getMeaningfulValue("fam8")}) AS diameterVariants,
        COUNT(DISTINCT ${this.getMeaningfulValue("unit")}) AS unitVariants
      FROM raw
      WHERE ean IS NOT NULL
      GROUP BY ean
    )`;
  }

  private getRecordColumns(): string {
    return `
      iseq,
      icod,
      branchCode,
      ean,
      description1,
      description2,
      description,
      fam2Code,
      fam2,
      fam3Code,
      fam3,
      fam4Code,
      fam4,
      fam5Code,
      fam5,
      fam7Code,
      fam7,
      fam8Code,
      fam8,
      unitCode,
      unit,
      isInactive,
      createdAt,
      sourceUpdatedAt,
      disabledAt
    `;
  }

  private isRowMetric(metric: InventoryIssueMetric): boolean {
    return [
      "WITHOUT_EAN",
      "WITHOUT_LONG_DESCRIPTION",
      "MISSING_FAMILY2",
      "MISSING_PRODUCT_TYPE",
      "MISSING_MATERIAL",
      "MISSING_SCHEDULE",
      "MISSING_DIAMETER",
      "INACTIVE",
      "OBSOLETE",
      "VERY_SHORT_DESCRIPTION",
    ].includes(metric);
  }

  private getRowMetricCondition(metric: InventoryIssueMetric): string {
    const conditions: Partial<Record<InventoryIssueMetric, string>> = {
      WITHOUT_EAN: "raw.ean IS NULL",
      WITHOUT_LONG_DESCRIPTION: "raw.description2 IS NULL",
      MISSING_FAMILY2: this.getMissingCondition("raw.fam2Code", "raw.fam2"),
      MISSING_PRODUCT_TYPE: this.getMissingCondition("raw.fam3Code", "raw.fam3"),
      MISSING_MATERIAL: this.getMissingCondition("raw.fam4Code", "raw.fam4"),
      MISSING_SCHEDULE: this.getMissingCondition("raw.fam7Code", "raw.fam7"),
      MISSING_DIAMETER: this.getMissingCondition("raw.fam8Code", "raw.fam8"),
      INACTIVE: "raw.isInactive = 1",
      OBSOLETE: "UPPER(raw.description) LIKE '%OBSOLETO%'",
      VERY_SHORT_DESCRIPTION: "CHAR_LENGTH(TRIM(raw.description)) < 12",
    };

    const condition = conditions[metric];
    if (!condition) throw new Error(`Metrica de registro no soportada: ${metric}`);
    return condition;
  }

  private getConflictMetricCondition(metric: InventoryIssueMetric, alias = "conflicts"): string {
    const conditions: Partial<Record<InventoryIssueMetric, string>> = {
      DESCRIPTION_CONFLICT: `${alias}.descriptionVariants > 1`,
      MULTIPLE_RECORD_EAN: `${alias}.copies > 1`,
      FAMILY2_CONFLICT: `${alias}.family2Variants > 1`,
      PRODUCT_TYPE_CONFLICT: `${alias}.productTypeVariants > 1`,
      MATERIAL_CONFLICT: `${alias}.materialVariants > 1`,
      TERMINATION_CONFLICT: `${alias}.terminationVariants > 1`,
      SCHEDULE_CONFLICT: `${alias}.scheduleVariants > 1`,
      DIAMETER_CONFLICT: `${alias}.diameterVariants > 1`,
      UNIT_CONFLICT: `${alias}.unitVariants > 1`,
      CRITICAL_CONFLICT: `(
        ${alias}.family2Variants > 1
        OR ${alias}.productTypeVariants > 1
        OR ${alias}.materialVariants > 1
        OR ${alias}.terminationVariants > 1
        OR ${alias}.scheduleVariants > 1
        OR ${alias}.diameterVariants > 1
        OR ${alias}.unitVariants > 1
      )`,
    };

    const condition = conditions[metric];
    if (!condition) throw new Error(`Metrica de conflicto no soportada: ${metric}`);
    return condition;
  }

  private readConflictMetrics(row: QueryRow) {
    return {
      copies: Number(row.copies),
      branches: Number(row.branches),
      descriptionVariants: Number(row.descriptionVariants),
      family2Variants: Number(row.family2Variants),
      productTypeVariants: Number(row.productTypeVariants),
      materialVariants: Number(row.materialVariants),
      terminationVariants: Number(row.terminationVariants),
      scheduleVariants: Number(row.scheduleVariants),
      diameterVariants: Number(row.diameterVariants),
      unitVariants: Number(row.unitVariants),
    };
  }

  private getMissingCondition(codeColumn: string, valueColumn: string): string {
    return `(
      TRIM(COALESCE(${codeColumn}, '')) = ''
      OR UPPER(TRIM(COALESCE(${valueColumn}, ''))) IN ('', 'NO ASIGNADO')
    )`;
  }

  private getMeaningfulValue(column: string): string {
    return `NULLIF(
      CASE
        WHEN UPPER(TRIM(COALESCE(${column}, ''))) = 'NO ASIGNADO' THEN ''
        ELSE UPPER(TRIM(COALESCE(${column}, '')))
      END,
      ''
    )`;
  }

  private enrichRecord(record: QueryRow): QueryRow {
    const branchCode = String(record.branchCode) as InventoryBranchCode;
    return {
      ...record,
      branchName: INVENTORY_BRANCHES[branchCode],
    };
  }

  private normalizeMetrics(row: QueryRow): QueryRow {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (key === "branchCode" || value === null || value instanceof Date) return [key, value];
        const numeric = Number(value);
        return [key, Number.isNaN(numeric) ? value : numeric];
      }),
    );
  }

  private groupDistributions(rows: QueryRow[]) {
    const result = new Map<string, Record<string, Array<{ value: string; total: number }>>>();

    for (const row of rows) {
      const scope = String(row.scopeCode);
      const dimension = String(row.dimension);
      const dimensions = result.get(scope) ?? {};
      const values = dimensions[dimension] ?? [];
      values.push({ value: String(row.value), total: Number(row.total) });
      dimensions[dimension] = values;
      result.set(scope, dimensions);
    }

    return result;
  }

  private async queryRows(sql: string, values: unknown[] = []): Promise<QueryRow[]> {
    const [rows] = await this.pool.query(sql, values);
    return rows as QueryRow[];
  }
}
