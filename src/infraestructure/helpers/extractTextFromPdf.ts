import pdfParse from 'pdf-parse';


export const extractTextFromPdf = async (fileBuffer: Buffer): Promise<string> => {
  const pdfData = await pdfParse(fileBuffer);
  return pdfData.text;
};