import {
  SyncCatalogVariantsInput,
  SyncCatalogVariantsResult,
  SyncProscaiCatalogVariantsUseCase,
} from "../use-cases/sync-proscai-catalog-variants.use-case";

type CatalogVariantSyncJobStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface CatalogVariantSyncJobSnapshot extends SyncCatalogVariantsResult {
  status: CatalogVariantSyncJobStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export class CatalogVariantSyncJobService {
  private currentJob?: CatalogVariantSyncJobSnapshot;

  constructor(
    private readonly syncUseCase: SyncProscaiCatalogVariantsUseCase,
    private readonly namespace: string,
  ) {}

  public start(input: Omit<SyncCatalogVariantsInput, "onProgress">): CatalogVariantSyncJobSnapshot {
    if (this.currentJob?.status === "RUNNING") {
      throw new Error("Ya hay una sincronizacion de variantes en ejecucion.");
    }

    const now = new Date().toISOString();
    this.currentJob = {
      namespace: this.namespace,
      totalVariants: 0,
      eligible: 0,
      reviewVariants: 0,
      excludedInactive: 0,
      unchanged: 0,
      changed: 0,
      embedded: 0,
      upserted: 0,
      stale: 0,
      deleted: 0,
      dryRun: input.dryRun === true,
      fullReconciliation: input.maxVariants === undefined && input.deleteStale !== false,
      status: "RUNNING",
      startedAt: now,
      updatedAt: now,
    };

    void this.run(input);
    return { ...this.currentJob };
  }

  public getStatus(): CatalogVariantSyncJobSnapshot | null {
    return this.currentJob ? { ...this.currentJob } : null;
  }

  private async run(input: Omit<SyncCatalogVariantsInput, "onProgress">): Promise<void> {
    try {
      const result = await this.syncUseCase.execute({
        ...input,
        onProgress: (progress) => this.updateProgress(progress),
      });
      this.updateProgress(result);

      if (this.currentJob) {
        this.currentJob.status = "COMPLETED";
        this.currentJob.completedAt = new Date().toISOString();
        this.currentJob.updatedAt = this.currentJob.completedAt;
      }
    } catch (error) {
      if (this.currentJob) {
        this.currentJob.status = "FAILED";
        this.currentJob.error = error instanceof Error ? error.message : "Error desconocido.";
        this.currentJob.updatedAt = new Date().toISOString();
      }
    }
  }

  private updateProgress(progress: SyncCatalogVariantsResult): void {
    if (!this.currentJob) return;
    Object.assign(this.currentJob, progress, { updatedAt: new Date().toISOString() });
  }
}
