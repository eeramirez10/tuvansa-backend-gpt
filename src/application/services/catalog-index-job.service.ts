import {
  IndexProscaiCatalogInput,
  IndexProscaiCatalogResult,
  IndexProscaiCatalogUseCase,
} from "../use-cases/index-proscai-catalog.use-case";
import { ProscaiCatalogScope } from "../../infraestructure/datasource/proscai-catalog.datasource";

type CatalogIndexJobStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface CatalogIndexJobSnapshot extends IndexProscaiCatalogResult {
  status: CatalogIndexJobStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export class CatalogIndexJobService {
  private currentJob?: CatalogIndexJobSnapshot;

  constructor(private readonly indexCatalogUseCase: IndexProscaiCatalogUseCase) {}

  public start(scope: ProscaiCatalogScope, maxProducts?: number): CatalogIndexJobSnapshot {
    if (this.currentJob?.status === "RUNNING") {
      throw new Error("Ya hay un indexado de catalogo en ejecucion.");
    }

    const now = new Date().toISOString();
    this.currentJob = {
      scope,
      scanned: 0,
      eligible: 0,
      excluded: 0,
      unchanged: 0,
      embedded: 0,
      upserted: 0,
      status: "RUNNING",
      startedAt: now,
      updatedAt: now,
    };

    void this.run({ scope, maxProducts });
    return { ...this.currentJob };
  }

  public getStatus(): CatalogIndexJobSnapshot | null {
    return this.currentJob ? { ...this.currentJob } : null;
  }

  private async run(input: IndexProscaiCatalogInput): Promise<void> {
    try {
      const result = await this.indexCatalogUseCase.execute({
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
        this.currentJob.error = error instanceof Error ? error.message : "Error desconocido al indexar.";
        this.currentJob.updatedAt = new Date().toISOString();
      }
    }
  }

  private updateProgress(progress: IndexProscaiCatalogResult): void {
    if (!this.currentJob) return;

    Object.assign(this.currentJob, progress, {
      updatedAt: new Date().toISOString(),
    });
  }
}
