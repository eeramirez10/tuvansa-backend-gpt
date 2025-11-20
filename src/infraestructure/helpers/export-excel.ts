// export-excel.ts
import ExcelJS from 'exceljs';
import * as path from 'path';
import { promises as fs } from 'fs';

// Si ya tienes este tipo en otro archivo, importa desde ahí:
export type AnalyzeResult = {
  product: string | null;
  material: string | null;
  diameter: string | null;
  ced: string | null;
  termino: string | null;
  acabado: string | null;
  subtipo: string | null;
  figura: string | null;
  radio: 'LARGO' | 'CORTO' | null;
  angulo: string | null;
  costura: string | null;
  tipo: string | null;
  grado: string | null;
  presion: string | null;
  originalDescription: string | null;
  ean: string | null;
  description: string | null;
  dos_palabras: string
};

// Acepta analyzeResults con `id` opcional (muchas veces lo pones fuera del objeto)
type RowOut = AnalyzeResult & { id?: string | null };

/**
 * Guarda en Excel (XLSX) los resultados de buildAnalyzeResult.
 * - `results`: array de objetos (pueden traer `id` o no)
 * - `outPath`: ruta del archivo a crear (p.ej. "./exports/productos.xlsx")
 */
export async function exportAnalyzeResultsToExcel(
  results: RowOut[],
  outPath: string
): Promise<void> {
  // Crea workbook/worksheet
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Productos');

  // console.log({ results })

  // Orden y metadatos de columnas (todas las propiedades de AnalyzeResult + id)



  ws.columns = [
    { header: 'id', key: 'id', width: 26 },
    { header: 'product', key: 'product', width: 16 },
    { header: 'material', key: 'material', width: 16 },
    { header: 'diameter', key: 'diameter', width: 14 },
    { header: 'ced', key: 'ced', width: 10 },
    { header: 'termino', key: 'termino', width: 14 },
    { header: 'acabado', key: 'acabado', width: 14 },
    { header: 'subtipo', key: 'subtipo', width: 18 },
    { header: 'figura', key: 'figura', width: 14 },
    { header: 'radio', key: 'radio', width: 10 },
    { header: 'angulo', key: 'angulo', width: 10 },
    { header: 'costura', key: 'costura', width: 14 },
    { header: 'tipo', key: 'tipo', width: 14 },
    { header: 'grado', key: 'grado', width: 12 },
    { header: 'presion', key: 'presion', width: 12 },
    { header: 'originalDescription', key: 'originalDescription', width: 60 },
    { header: 'ean', key: 'ean', width: 22 },
    { header: 'description', key: 'description', width: 80 },
  ];

  // Estilo encabezado
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };

  // Helper: null/undefined -> '' para que Excel no ponga "null"
  const v = (x: unknown) => (x === null || x === undefined ? '' : x);

  // Agrega filas
  for (const r of results) {
    ws.addRow({
      id: v(r.id),
      product: v(r.product),
      material: v(r.material),
      diameter: v(r.diameter),
      ced: v(r.ced),
      termino: v(r.termino),
      acabado: v(r.acabado),
      subtipo: v(r.subtipo),
      figura: v(r.figura),
      radio: v(r.radio),
      angulo: v(r.angulo),
      costura: v(r.costura),
      tipo: v(r.tipo),
      grado: v(r.grado),
      presion: v(r.presion),
      originalDescription: v(r.originalDescription),
      ean: v(r.ean),
      description: v(r.description),
    });
  }

  // Crea carpeta destino si no existe y escribe archivo
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await wb.xlsx.writeFile(outPath);
}
