import { envs } from "../../config/envs";


import { Index, Pinecone, RecordMetadata, } from '@pinecone-database/pinecone'

interface VectorProduct {

  id: string;
  values: number[];
  metadata?: Record<string, any>
}

export class PineconeService {



  private index;

  constructor() {
    const client = new Pinecone({ apiKey: envs.PINECONE_API_KEY });
    this.index = client.Index('proscai')
  }


  async upsert(vector: VectorProduct[]): Promise<void> {


    await this.index.upsert(vector)
  }
  async query(vector: number[], topK: number, filter?: Record<string, string>): Promise<object[]> {



    let result;

    // console.log({ filter })

    if (filter) {

      result = await this.index.query({
        topK,
        vector,
        includeMetadata: true,
        filter

      })

    } else {

      result = await this.index.query({
        topK,
        vector,
        includeMetadata: true,
      })

    }




    return result.matches || []
  }


}