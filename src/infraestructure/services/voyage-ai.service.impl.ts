import { VoyageAIClient } from "voyageai";
import { envs } from "../../config/envs";

export class VoyageAIService {

  private client = new VoyageAIClient({ apiKey: envs.VOYAGEAI_API_KEY })

  constructor() { }

  async embed (texts:string[]) {
    const response = await this.client.embed({
      input: texts,
      model:'voyage-3-large'
    })

    return response.data
  }

}