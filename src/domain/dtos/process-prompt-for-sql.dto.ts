interface Options {
  prompt: string
}


export class ProcessPromptForSqlDto {

  constructor(public readonly prompt: string) {


   }

  static execute(options: Options): [string?, ProcessPromptForSqlDto?] {
    const { prompt } = options

    if(!prompt) return['Prompt is required']

    return [, new ProcessPromptForSqlDto(prompt)]

  }

}