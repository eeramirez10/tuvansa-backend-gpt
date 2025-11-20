

export class GenerateSummaryDto {

  public readonly prompt: string
  public readonly sqlResult: any

  constructor(props: { prompt: string, sqlResult: any }){
    this.prompt = props.prompt
    this.sqlResult = props.sqlResult
  }

}