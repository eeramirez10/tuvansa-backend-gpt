

interface Options {
  prompt: string
  sql: string
}

export class GptEntity {

  public prompt: string
  public sql: string


  constructor(options:Options){
    this.prompt = options.prompt
    this.sql = options.sql
  }

  public static fromObject(object:Options): GptEntity {

    const { prompt, sql} = object

    if (!prompt) throw 'Prompt is required'
    if(!sql) throw 'sql is required'

    return new GptEntity({prompt, sql})
  }



}