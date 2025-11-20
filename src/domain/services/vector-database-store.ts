
export interface Vector {

  id: string,
  values: number[],
  metadata?: object

}

export abstract class VectorDatabaseStore {

  abstract upsert(vector: Vector): Promise<void>

  abstract query(vector: number[], topK: number, includeMetadata: boolean): Promise<object[]>


}