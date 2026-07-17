import {
  ProductAvailability,
  ProductCodeAvailability,
  ProductAvailabilityCurrency,
  ProductAvailabilityService,
  ProductBranchAvailability,
} from "../../domain/services/product-availability-service";

export class ErpProductAvailabilityHttpService implements ProductAvailabilityService {
  constructor(
    private readonly baseUrl: string | undefined,
    private readonly timeoutMs: number,
    private readonly apiKey?: string,
  ) {}

  public isEnabled(): boolean {
    return Boolean(this.baseUrl?.trim());
  }

  public async findByEans(eans: string[]): Promise<ProductAvailability[]> {
    if (!this.isEnabled() || eans.length === 0) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = `${this.baseUrl!.trim().replace(/\/+$/, "")}/availability/batch`;

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(this.apiKey ? { "X-Internal-Api-Key": this.apiKey } : {}),
        },
        body: JSON.stringify({ eans }),
      });

      if (!response.ok) {
        throw new Error(`ERP availability service returned HTTP ${response.status}.`);
      }

      const payload = await response.json() as unknown;
      if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).items)) {
        throw new Error("ERP availability service returned an invalid response.");
      }

      return (payload as { items: unknown[] }).items
        .map((item) => this.parseItem(item))
        .filter((item): item is ProductAvailability => item !== null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("ERP availability service timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseItem(input: unknown): ProductAvailability | null {
    if (!input || typeof input !== "object") return null;

    const item = input as Record<string, unknown>;
    const ean = this.toText(item.ean);
    if (!ean) return null;

    const costsInput = item.costs && typeof item.costs === "object"
      ? item.costs as Record<string, unknown>
      : {};
    const branches = Array.isArray(item.branches)
      ? item.branches
          .map((branch) => this.parseBranch(branch))
          .filter((branch): branch is ProductBranchAvailability => branch !== null)
      : [];
    const codes = Array.isArray(item.codes)
      ? item.codes
          .map((code) => this.parseCode(code))
          .filter((code): code is ProductCodeAvailability => code !== null)
      : [];

    return {
      ean,
      productCode: this.toText(item.productCode),
      sourceProductCodes: Array.isArray(item.sourceProductCodes)
        ? item.sourceProductCodes.map((value) => this.toText(value)).filter(Boolean)
        : [],
      hasMultipleProductCodes: Boolean(item.hasMultipleProductCodes),
      description: this.toText(item.description),
      unit: this.toText(item.unit),
      costs: {
        average: this.toNumber(costsInput.average),
        last: this.toNumber(costsInput.last),
        currency: this.toCurrency(costsInput.currency),
      },
      totalStock: this.toNumber(item.totalStock),
      availableInAnyBranch: Boolean(item.availableInAnyBranch),
      branches,
      codes,
    };
  }

  private parseCode(input: unknown): ProductCodeAvailability | null {
    if (!input || typeof input !== "object") return null;

    const code = input as Record<string, unknown>;
    const icod = this.toText(code.icod);
    if (!icod) return null;

    const costsInput = code.costs && typeof code.costs === "object"
      ? code.costs as Record<string, unknown>
      : {};
    const branches = Array.isArray(code.branches)
      ? code.branches
          .map((branch) => this.parseBranch(branch))
          .filter((branch): branch is ProductBranchAvailability => branch !== null)
      : [];

    return {
      icod,
      homeBranchCode: this.toNullableText(code.homeBranchCode),
      homeBranchName: this.toNullableText(code.homeBranchName),
      description: this.toText(code.description),
      unit: this.toText(code.unit),
      costs: {
        average: this.toNumber(costsInput.average),
        last: this.toNumber(costsInput.last),
        currency: this.toCurrency(costsInput.currency),
      },
      totalStock: this.toNumber(code.totalStock),
      availableInAnyBranch: Boolean(code.availableInAnyBranch),
      branches,
    };
  }

  private parseBranch(input: unknown): ProductBranchAvailability | null {
    if (!input || typeof input !== "object") return null;

    const branch = input as Record<string, unknown>;
    const branchCode = this.toText(branch.branchCode);
    if (!branchCode) return null;

    const stock = this.toNumber(branch.stock);
    return {
      branchCode,
      branchName: this.toText(branch.branchName),
      stock,
      available: stock > 0,
    };
  }

  private toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private toNullableText(value: unknown): string | null {
    return this.toText(value) || null;
  }

  private toNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  private toCurrency(value: unknown): ProductAvailabilityCurrency {
    return String(value).toUpperCase() === "USD" ? "USD" : "MXN";
  }
}
