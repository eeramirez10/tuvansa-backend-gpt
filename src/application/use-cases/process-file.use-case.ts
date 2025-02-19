import { extractTextFromExcel } from "../../infraestructure/helpers/extractTextFromExcel";
import { extractTextFromPdf } from "../../infraestructure/helpers/extractTextFromPdf";


export class ProcessFileUseCase {


  async execute(file: Express.Multer.File) {
    if (file.mimetype === 'application/pdf') {
      return extractTextFromPdf(file.buffer)
    }

    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel') {
      return extractTextFromExcel(file.buffer)
    }

    throw new Error('Formato no valido')
  }

}