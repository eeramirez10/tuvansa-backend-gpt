import * as xlsx from 'xlsx';

export const extractTextFromExcel = (fileBuffer: Buffer) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  return JSON.stringify(sheetData, null, 2);
};