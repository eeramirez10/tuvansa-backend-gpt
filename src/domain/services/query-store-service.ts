
export abstract class QueryStoreService {

  abstract create(sql: string, ttl?: number): Promise<string>

  abstract get(queryId: string): Promise<string | null>

  abstract delete(queryId: string): Promise<void>

  abstract clearExpired(): Promise<void>


}