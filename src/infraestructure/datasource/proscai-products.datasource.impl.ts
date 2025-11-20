import mysql from 'mysql2/promise';
import { envs } from '../../config/envs';
import { Product, ProductDatasource } from '../../domain/datasource/product.datasource';
export class ProscaiProductsDatasourceImpl implements ProductDatasource {


  private readonly pool = mysql.createPool({
    host: envs.URL_MYSQL,
    user: envs.USER_MYSQL,
    password: envs.PASSWORD_MYSQL,
    database: envs.DB_MYSQL
  })

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  async findAll(): Promise<Product[]> {
    try {

      const [rows] = await this.pool.query(`
        SELECT IEAN as ean,I2DESCR as description FROM FINV
        LEFT JOIN FINV2 ON FINV2.I2KEY=FINV.ISEQ
        WHERE (mid(ICOD,1,1)<>'Z') AND ITIPO=1 AND IEAN<>'' AND I2DESCR<>'' AND mid(IEAN,1,1)<>'0' AND 
         (IULTCPR BETWEEN '2018-01-01'  AND '2025-12-31'  OR  IULTVTA BETWEEN '2018-01-01'  AND '2025-12-31'  ) and IEAN like 'TSC%'
        GROUP BY IEAN
        ORDER BY IEAN
        limit 200 OFFSET 200

      `) as any[]


      return rows
    } catch (error) {
      console.log(error)
      throw new Error('Error al ejecutar la consulta SQL')
    }
  }


  async findAllBatches(): Promise<Product[]> {
    const limit = 200;
    let offset = 0;
    let hasMore = true;
    const allResults: Product[] = [];

    while (hasMore) {
      try {
        const [rows] = await this.pool.query(
          `
          SELECT IEAN as ean, I2DESCR as description 
          FROM FINV
          LEFT JOIN FINV2 ON FINV2.I2KEY = FINV.ISEQ
          WHERE 
            mid(ICOD,1,1) <> 'Z' AND 
            ITIPO = 1 AND 
            IEAN <> '' AND 
            I2DESCR <> '' AND 
            mid(IEAN,1,1) <> '0' AND 
            (
              IULTCPR BETWEEN '2018-01-01' AND '2025-12-31' OR 
              IULTVTA BETWEEN '2018-01-01' AND '2025-12-31'
            ) AND 
            IEAN LIKE 'TCC%'
          GROUP BY IEAN
          ORDER BY IEAN
          LIMIT ? OFFSET ?;
          `,
          [limit, offset]
        ) as any[];

        console.log(`Lote con OFFSET ${offset}: ${rows.length} registros`);

        allResults.push(...rows);

        if (rows.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
          console.log('Esperando 1 minutos...');
          await this.delay(100000); // 3 minutos
        }
      } catch (error) {
        console.error('Error al consultar lote:', error);
        throw error;
      }
    }

    return allResults;
  }
}