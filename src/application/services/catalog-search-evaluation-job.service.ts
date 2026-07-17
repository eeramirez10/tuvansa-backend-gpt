import {
  CatalogSearchEvaluationProgress,
  CatalogSearchEvaluationResult,
  CatalogSearchEvaluationSummary,
} from "../../domain/entities/catalog-search-evaluation.entity";
import {
  EvaluateProscaiCatalogSearchInput,
  EvaluateProscaiCatalogSearchUseCase,
} from "../use-cases/evaluate-proscai-catalog-search.use-case";

type CatalogSearchEvaluationJobStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface CatalogSearchEvaluationJobSnapshot {
  status: CatalogSearchEvaluationJobStatus;
  totalCases: number;
  completedCases: number;
  currentCaseId?: string;
  summary: CatalogSearchEvaluationSummary;
  results: CatalogSearchEvaluationResult[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export class CatalogSearchEvaluationJobService {
  private currentJob?: CatalogSearchEvaluationJobSnapshot;

  constructor(private readonly evaluationUseCase: EvaluateProscaiCatalogSearchUseCase) {}

  public listCases() {
    return this.evaluationUseCase.listCases();
  }

  public start(input: EvaluateProscaiCatalogSearchInput): CatalogSearchEvaluationJobSnapshot {
    if (this.currentJob?.status === "RUNNING") {
      throw new Error("Ya hay una evaluacion del buscador en ejecucion.");
    }

    const cases = this.evaluationUseCase.selectCases(input.caseIds);
    const now = new Date().toISOString();
    this.currentJob = {
      status: "RUNNING",
      totalCases: cases.length,
      completedCases: 0,
      summary: this.evaluationUseCase.emptySummary(cases.length),
      results: [],
      startedAt: now,
      updatedAt: now,
    };

    void this.run(input);
    return this.clone(this.currentJob);
  }

  public getStatus(): CatalogSearchEvaluationJobSnapshot | null {
    return this.currentJob ? this.clone(this.currentJob) : null;
  }

  private async run(input: EvaluateProscaiCatalogSearchInput): Promise<void> {
    try {
      const result = await this.evaluationUseCase.execute({
        ...input,
        onProgress: (progress) => this.updateProgress(progress),
      });
      this.updateProgress(result);

      if (this.currentJob) {
        this.currentJob.status = "COMPLETED";
        this.currentJob.currentCaseId = undefined;
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

  private updateProgress(progress: CatalogSearchEvaluationProgress): void {
    if (!this.currentJob) return;
    Object.assign(this.currentJob, progress, { updatedAt: new Date().toISOString() });
  }

  private clone(snapshot: CatalogSearchEvaluationJobSnapshot): CatalogSearchEvaluationJobSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as CatalogSearchEvaluationJobSnapshot;
  }
}
