import { Request, Response } from "express";
import { ProcessPromptForSqlDto } from '../../domain/dtos/process-prompt-for-sql.dto';
import { LanguageModelService } from '../../domain/services/language-model-service';
import { ProcessPromptForSqlUseCase } from "../../application/use-cases/process-prompt-for-sql.use-case";
import { purchaseSchema } from "../../data/purchase-schema";
import { SqlDataSource } from '../../domain/datasource/sql.datasource';
import { QueryStoreService } from '../../domain/services/query-store-service';
import { PaginationDto } from "../../domain/dtos/pagination.dto";
import { buscarCostura, cleanDiameter, detectarMaterialPlastico, esPlasticoDesdeBD, extractAnguloRadio, extraerCedulaDeDescripcion, extraerFiguraDeDescripcion, extraerGradoMaterialBrida, extraerPresion, normalizarDescripcionSWPorCedula, normalizarGrados, normalizeValue, quitarPalabraBrida, sanitizeForDB, sanitizeSQL, verifyData } from "../../infraestructure/helpers/sanitizeSql";
import { ProductRepository } from "../../domain/repositories/product.repository";
import { VoyageAIService } from "../../infraestructure/services/voyage-ai.service.impl";
import { PineconeService } from '../../infraestructure/services/pinecone-service';
import { UpsertProductsUseCase } from "../../application/use-cases/upsert-products.use-case";
import { ProcessFileUseCase } from '../../application/use-cases/process-file.use-case';
import { randomUUID } from "crypto";
import mysql from 'mysql2/promise';
import { envs } from "../../config/envs";
import { detectProducto, extraerDesdeTubo, normalizarTubo } from "../../utils/normalize-text";
import { AnalyzeResult, buildAnalyzeResult } from "../../infraestructure/helpers/buildAnalyzeResult";

import { MatchAllProductsUseCase } from "../../application/use-cases/match-all-products.use-case";

/**
 * @swagger
 * tags:
 *   name: GPT
 *   description: Operaciones relacionadas con GPT y SQL
 */


export class GptController {

  private readonly pool = mysql.createPool({
    host: envs.URL_MYSQL,
    user: envs.USER_MYSQL,
    password: envs.PASSWORD_MYSQL,
    database: envs.DB_MYSQL
  })

  constructor(

    private readonly languageModelService: LanguageModelService,
    private readonly sqlDataSource: SqlDataSource,
    private readonly queryStoreService: QueryStoreService,
    private readonly productRepository: ProductRepository,
    private readonly voyage: VoyageAIService,
    private readonly pinecone: PineconeService
  ) { }



  purchaseAnalisys = async (req: Request, res: Response) => {


    try {

      const [error, processPromptForSqlDto] = ProcessPromptForSqlDto.execute(req.body)

      const { sql } = await new ProcessPromptForSqlUseCase(this.languageModelService)
        .execute(processPromptForSqlDto, purchaseSchema)

      const baseSql = sanitizeSQL(sql)

      const queryId = await this.queryStoreService.create(baseSql)



      // const [total] = await new ExecuteSqlUseCase(this.sqlDataSource).execute({ sql: countSql })
      const { items, page, pageSize } = await this.sqlDataSource
        .executeSql({ sql: baseSql })


      res.json({
        queryId,
        items,
        page,
        pageSize,
        // total,
        // totalPages: paginationResult.totalPages

      })

      if (error) {
        res.status(400).json({ error })
        return
      }



    } catch (error) {
      console.error('Error en GptController:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }





  }

  getStoredQuery = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const queryId = req.query.queryId;

    const [error, paginationDto] = PaginationDto.execute({ page, pageSize, queryId })

    if (error) {
      res.status(400).json({ error })
      return
    }

    try {

      const savedSql = await this.queryStoreService.get(paginationDto.queryId)

      if (!savedSql) {

        res.status(400).json({
          error: 'query not found'
        })
        return
      }

      const { items, page, pageSize } = await this.sqlDataSource
        .executeSql({
          sql: savedSql,
          page: paginationDto.page,
          pageSize: paginationDto.pageSize
        })



      res.json({
        queryId,
        items,
        page,
        pageSize,
        // total,
        // totalPages: paginationResult.totalPages

      })
    } catch (error) {
      console.error('Error al recuperar SQL paginado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }






  }

  upsertProducts = async (req: Request, res: Response) => {


    res.json({
      msg: 'Proceso iniciado, se están insertando los productos en lotes de 200...'
    });





    await this.upsertAllProducts()

    // const products = await this.productRepository.findAllBatches()


    // const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone)

    // await upsert.execute(products)

    // res.json({
    //   msg: 'Insertados correctamente'
    // })

  }

  matchProduct = async (req: Request, res: Response) => {


    const PRODUCTS_TYPES = {
      VALVULA: 'VALVULA',
      CODO: 'CODO',
      TUBO: 'TUBO',
      BRIDA: 'BRIDA',
      "TUBO PLASTICO": 'TUBO PLASTICO'

    }

    const description = req.body.description;

    let matchProducts;

    if (!description) {

      res.status(400).json({ error: 'description is required' })
      return
    }

    const normalizedDescription = description

    // const productTipe =
    //   await this.languageModelService
    //     .detectarTipoProducto(normalizedDescription);



    matchProducts = await new MatchAllProductsUseCase(
      this.languageModelService,
      this.voyage,
      this.pinecone
    )
      .execute(normalizedDescription)

    res.json(matchProducts)
    return

    // if (productTipe === null || !PRODUCTS_TYPES[productTipe]) {



    //   res.status(404).json({ error: 'Type Product not found' })
    //   return
    // }




    try {

      // if (productTipe === 'VALVULA') {

      //   matchProducts = await new MatchValvProductsUseCase(
      //     this.languageModelService,
      //     this.voyage,
      //     this.pinecone
      //   )
      //     .execute(description)
      // }

      // if (productTipe === 'TUBO') {

      //   matchProducts = await new MatchPipeProductsUseCase(
      //     this.languageModelService,
      //     this.voyage,
      //     this.pinecone
      //   )
      //     .execute(normalizedDescription)

      // }

      // if (productTipe === 'TUBO PLASTICO') {

      //   matchProducts = await new MatchPlasticPipeProductsUseCase(
      //     this.languageModelService,
      //     this.voyage,
      //     this.pinecone
      //   )
      //     .execute(normalizedDescription)

      // }

      // if (productTipe === "CODO") {

      //   matchProducts = await new MatchCodoProductsUseCase(
      //     this.languageModelService,
      //     this.voyage,
      //     this.pinecone
      //   )
      //     .execute(normalizedDescription)
      // }

      // if (productTipe === 'BRIDA') {

      //   matchProducts = await new MatchBridaProductsUseCase(
      //     this.languageModelService,
      //     this.voyage,
      //     this.pinecone
      //   )
      //     .execute(normalizedDescription)


      // }







      res.json(matchProducts)

    } catch (error) {

      res.status(500).json({ error })

    }




  }

  transformQuote = async (req: Request, res: Response) => {

    const file = req.file

    if (!file) {
      res.status(400).json({ error: 'File is required' })
      return
    }

    try {

      const texContent = await new ProcessFileUseCase().execute(file)

      
      const quotation = await this.languageModelService.extractQuotationData(texContent)


      res.json({ quotation: quotation.map((quote) => ({ id: randomUUID(), ...quote })) })

    } catch (error) {
      res.status(500).json({ error })
    }



  }


  private upsertAllProducts = async () => {

    const limit = 200;
    let offset = 3200;
    let hasMore = true;
    console.log({ limit })



    while (hasMore) {
      let allProducts = []
      try {

        const [rows] = await this.pool.query(this.querySQLProductosPlasticos(limit, offset)) as any;


        console.log(`Procesando lote OFFSET ${offset}, total: ${rows.length}`);

        const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone);

        if (rows.length === 0) {
          hasMore = false;
          console.log('No hay más productos.');
          break;
        }


        for (let p of rows) {

          const {
            ICOD,
            ean,
            description2,
            product,
            tipo,
            subtipo,
            material,
            diametro_en_descripcion,
            cedula_en_descripcion,
            diametro,
            cedula,
            unidad,
            radio,
            termino,
            acabado,
            dos_palabras,
            costura
          } = p




          if (product && detectProducto(description2)) {

            const diameter = diametro ? cleanDiameter(diametro) : ''
            const cedOrSW = ((cedula === 'STD' || cedula === '40') && cedula) ?? ((termino === 'SW') && termino)
            const selectDescription = description2
            const figura = extraerFiguraDeDescripcion(selectDescription) ?? ''
            const desc = normalizarDescripcionSWPorCedula(selectDescription, cedOrSW) ?? ''
            const sub = subtipo === 'NO ASIGNADO' || !subtipo ? '' : subtipo
            let cedulaFinal = extraerCedulaDeDescripcion(selectDescription) ?? '';

            const term = termino === 'NO ASIGNADO' || !termino ? '' : termino
            const aca = acabado === 'NO ASIGNADO' || !acabado ? '' : acabado
            // const addTypes = `${desc}  ${mat}  ${!termino ? '' : omit[termino] ? '' : termino} ${!acabado ? '' : omit[acabado] ? '' : acabado} `
            const { angulo, radio: radi } = extractAnguloRadio(radio === 'NO ASIGNADO' || !radio ? selectDescription : radio) ?? { radio: '', angulo: '' }

            const cost = costura ? normalizeValue(costura) : ''

            const presion = extraerPresion(selectDescription) ?? ''

            const newProducts: AnalyzeResult = {
              id: sanitizeForDB(normalizarGrados(ean)),
              product: detectProducto(description2),
              material: material === 'NO ASIGNADO' ? '' :
                esPlasticoDesdeBD(material) ?
                  detectarMaterialPlastico(selectDescription) ?
                    detectarMaterialPlastico(selectDescription)
                    : material
                  :
                  normalizeValue(material),
              diameter: diameter === 'NO ASIGNADO' ? '' : diameter,
              ced: cedulaFinal,
              termino: termino === 'NO ASIGNADO' || !termino ? '' : termino,
              acabado: acabado === 'NO ASIGNADO' || !acabado ? '' : acabado,
              subtipo: subtipo === 'NO ASIGNADO' || !subtipo ? '' : subtipo,
              figura,
              radio: radi ?? '',
              angulo: angulo ?? '',
              costura: buscarCostura(cost) ?? '',
              tipo: tipo,
              grado: extraerGradoMaterialBrida(selectDescription) ?? '',
              presion,
              originalDescription: description2,
              ean: ean,
              description: desc,
            }




            allProducts.push(newProducts)

          }

        }



        await upsert.execute(allProducts);
        offset += limit;

        if (rows.length < limit) {
          hasMore = false;
          console.log('Último lote procesado.');
          break;
        }

        console.log('Esperando 1 minuto antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 60000));

        // await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {

        console.log(error)

      }
    }



    // await exportAnalyzeResultsToExcel(allProducts, `./exports/analyzeResults_${Date.now()}.xlsx`);


  }



  private querySQLProductosPlasticos = (limit: number, offset: number) => {

    return String.raw`
WITH cleaned AS (
  SELECT
    FINV.ICOD,
    FINV.IEAN AS ean,
    FINV2.I2DESCR AS description2,
    FINV.IDESCR AS description1,

    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      (CONVERT(FINV.IDESCR USING utf8mb4)) COLLATE utf8mb4_0900_ai_ci,
                      _utf8mb4'[°º"''´\`′″¨×]+', _utf8mb4' '               
                    ),
                    _utf8mb4'[(),:;!?]+', _utf8mb4' '                     
                  ),
                  _utf8mb4'\\s+', _utf8mb4' '                           
                ),
                _utf8mb4'(^|\\s)(de|para|con)\\.?(?=\\s|$)', _utf8mb4' ', 1, 0, 'i'  
              ),
              _utf8mb4'(^|\\s)ced\\.?(?=\\s|$)', _utf8mb4' ', 1, 0, 'i'  
            ),
            _utf8mb4'(^|\\s)\\S*[0-9]\\S*(?=\\s|$)', _utf8mb4' '         
          ),
          _utf8mb4'(^|\\s)\\S*/\\S*(?=\\s|$)', _utf8mb4' '               
        ),
        _utf8mb4'(^|\\s)\\S*[x]\\S*(?=\\s|$)', _utf8mb4' ', 1, 0, 'i'   
      )
    ) AS cleaned,

    FAM2.FAMDESCR AS tipo,
    FAM3.FAMDESCR as  radio,
    FAM3.FAMDESCR as costura,
    FAM3.FAMDESCR AS subtipo,
    FAM4.FAMDESCR AS material,
    FAM8.FAMDESCR AS diametro,
    FAM7.FAMDESCR AS cedula,
    FUNIDAD.UDESCR AS unidad,
    FAM5.FAMDESCR AS termino,
    FAMC.FAMDESCR AS acabado
  FROM FINV
  LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM = FINV.IFAM2
  LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM = FINV.IFAM3
  LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM = FINV.IFAM4
  LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM = FINV.IFAM8
  LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM = FINV.IFAM7
  LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM = FINV.IFAM5
  LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM = FINV.IFAMC
  LEFT JOIN FUNIDAD ON FUNIDAD.UCOD = FINV.IUM
  LEFT JOIN FINV2 ON FINV2.I2KEY = FINV.ISEQ
  WHERE MID(FINV.ICOD,1,2)='01'
	AND FAM4.FAMDESCR NOT IN ('HDPE','PVC','PLASTICO','CPVC','PPR')
    AND FINV.IEAN NOT LIKE 'TCC%'
    AND FINV.IEAN NOT LIKE 'TSC%'
    AND FINV.IEAN NOT LIKE 'V%'
    and FINV2.I2DESCR NOT like 'CODO%'
    and FINV2.I2DESCR NOT like 'BRIDA%'
    and FINV2.I2DESCR <> ''
    AND FINV.IEAN <> ''
),
base AS (
  SELECT
    c.*,

    REGEXP_SUBSTR(
      c.cleaned,
      _utf8mb4'^(?:[[:alpha:]]+(?:[-_.][[:alpha:]]+)*\\.?)(?:\\s+[[:alpha:]]+(?:[-_.][[:alpha:]]+)*\\.?){1,2}'
    ) AS tres_palabras,

    REGEXP_SUBSTR(
      c.cleaned,
      _utf8mb4'^(?:[[:alpha:]]+(?:[-_.][[:alpha:]]+)*\\.?)(?:\\s+[[:alpha:]]+(?:[-_.][[:alpha:]]+)*\\.?)'
    ) AS dos_palabras
  FROM cleaned c
),
enriched AS (
  SELECT
    b.*,
    UPPER(REPLACE(SUBSTRING_INDEX(b.dos_palabras, ' ', 1), '.', '')) AS tok1,
    UPPER(REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(b.dos_palabras, ' ', 2), ' ', -1), '.', '')) AS tok2
  FROM base b
)

SELECT
  e.ICOD,
  e.ean,
  e.description2,

  CASE
    WHEN e.dos_palabras IS NULL THEN NULL

    WHEN e.tok1 IN ('PVC','CPVC','HDPE','PPR','PP','PPH','PP-H','PEAD','PE','HD')
         AND e.tok2 IN ('TUBERIA','TUBO') THEN 'TUBERIA'

    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^VALV(ULA)?$', 'i')            THEN 'VALVULA'    
    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^RED(UCCION)?$', 'i')          THEN 'REDUCCION'   
    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^REST$', 'i')                  THEN 'RESTRICTOR'  
    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^STUB$', 'i')                  THEN 'STUB-END'    
    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^TE$', 'i')                    THEN 'TEE'         
    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^Y(EE)?$', 'i')                THEN 'YEE'        
    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^TUB(ERIA|O)?$', 'i')          THEN 'TUBO'    

    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^(ABRAZADERA|ADAPTADOR|BRIDA|CODO|COPLE|CRUZ|CURVA|NIPLE|UNION|TAPON|CONECTOR|ROCIADOR|LLAVE|TUERCA|REGISTRO|RESTRICTOR|SALVATUBOS)$', 'i')
         THEN UPPER(e.tok1)

    WHEN REGEXP_LIKE(e.tok1, _utf8mb4'^(CEMENTO|PRIMER|LIMPIADOR|PEGAMENTO|LUBRICANTE|SILICON|CLEAR|GLANDULA|BROCHA)$', 'i')
         THEN UPPER(e.tok1)

    ELSE UPPER(e.tok1)
  END AS product,

  e.tipo,
  e.subtipo,
  

  CASE
    WHEN REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])c[^[:alpha:]]*p[^[:alpha:]]*v[^[:alpha:]]*c([^[:alpha:]]|$)', 'i') THEN 'CPVC'
    WHEN REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])p[^[:alpha:]]*p[^[:alpha:]]*r([^[:alpha:]]|$)', 'i')               THEN 'PPR'
    WHEN REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])h[^[:alpha:]]*d[^[:alpha:]]*p[^[:alpha:]]*e([^[:alpha:]]|$)', 'i')
       OR REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])p[^[:alpha:]]*e[^[:alpha:]]*a[^[:alpha:]]*d([^[:alpha:]]|$)', 'i')
       OR REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])p[^[:alpha:]]*e[^[:alpha:]]*[^[:alpha:]]*4710([^[:alpha:]]|$)', 'i') THEN 'HDPE'
    WHEN REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])p[^[:alpha:]]*v[^[:alpha:]]*c([^[:alpha:]]|$)', 'i')               THEN 'PVC'
    WHEN REGEXP_LIKE(e.description2, _utf8mb4'(^|[^[:alpha:]])plastico([^[:alpha:]]|$)', 'i')                                     THEN 'PLASTICO'
    ELSE e.material
  END AS material,

  COALESCE(
    REGEXP_SUBSTR(e.description2, _utf8mb4'([0-9]+(?:\\s*[1-9]/[0-9])?\\s*")', 1, 1, 'i'),
    REGEXP_SUBSTR(e.description2, _utf8mb4'([0-9]+(?:\\.[0-9]+)?)\\s*mm', 1, 1, 'i')
  ) AS diametro_en_descripcion,
  REGEXP_SUBSTR(e.description2, _utf8mb4'ced\\.?\\s*[0-9]+', 1, 1, 'i') AS cedula_en_descripcion,

  e.diametro,
  e.costura,
  e.radio,
  e.cedula,
  e.unidad,
  e.termino,
  e.acabado,
  e.dos_palabras
FROM enriched e
ORDER BY e.dos_palabras, e.ICOD
LIMIT ${limit} OFFSET ${offset};
`;

  }


  private upsertValvulas = async () => {

    const limit = 100;
    let offset = 0;
    let hasMore = true;

    let concatDescrandEan;



    while (hasMore) {
      try {
        const [rows] = await this.pool.query(
          `
          SELECT ICOD,IEAN as ean,
          I2DESCR AS description2,
          IDESCR AS description1,
          FAM2.FAMDESCR as tipo,
          FAM3.FAMDESCR as subtipo,
          FAM4.FAMDESCR as material,
          FAM8.FAMDESCR as diametro,
          FAM7.FAMDESCR as cedula,
          UDESCR as unidad,
          FAM5.FAMDESCR as termino,
          FAMC.FAMDESCR as acabado

          FROM FINV
          LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM=FINV.IFAM2
          LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM=FINV.IFAM3
          LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM=FINV.IFAM4
          LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM=FINV.IFAM8
          LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM=FINV.IFAM7
          LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM=FINV.IFAM5
          LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM=FINV.IFAMC
          LEFT JOIN FUNIDAD ON FUNIDAD.UCOD=FINV.IUM
          LEFT JOIN FINV2 ON FINV2.I2KEY=FINV.ISEQ
          WHERE  mid(ICOD,1,2)='01' and IEAN like 'V%' 
          LIMIT ? OFFSET ?;
        `,
          [limit, offset]
        ) as any[];

        console.log(rows.length)

        if (rows.length === 0) {
          hasMore = false;
          console.log('No hay más productos.');
          break;
        }

        console.log(`Procesando lote OFFSET ${offset}, total: ${rows.length}`);

        const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone);


        const terminos = {
          BISELADO: 'BISELADO',
          PLANO: 'PLANO',
          RANURADO: 'RANURADO',
          ROSCADO: 'ROSCADO',
          'NO ASIGNADO': 'NO ASIGNADO',
        }

        const omit = {
          BISELADO: 'BISELADO',
          PLANO: 'PLANO',
          'NO ASIGNADO': 'NO ASIGNADO',
          NEGRO: 'NEGRO',
          POLIURETANO: 'POLIURETANO',
          SW: 'SW'
        }

        const acabados = {
          NEGRO: 'NEGRO',
          'NO ASIGNADO': 'NO ASIGNADO',
          GALVANIZADO: 'GALVANIZADO',
          ROJA: 'ROJA',
          POLIURETANO: 'POLIURETANO',
        }


        concatDescrandEan = rows.map((r, i) => {


          const {
            ean,
            subtipo,
            description1,
            description2,
            material,
            diametro,
            cedula,
            termino,
            acabado
          } = r as Record<string, string>

          const diameter = diametro ? cleanDiameter(diametro) : ''

          const cedOrSW = ((cedula === 'STD' || cedula === '40') && cedula) ?? ((termino === 'SW') && termino)

          const selectDescription = description2 ?? description1

          const figura = extraerFiguraDeDescripcion(selectDescription) ?? ''

          const desc = normalizarDescripcionSWPorCedula(selectDescription, cedOrSW)

          const sub = subtipo === 'NO ASIGNADO' || !subtipo ? '' : subtipo

          let cedulaFinal = cedula && cedula.toUpperCase() !== 'NO ASIGNADO' && cedula !== ''
            ? cedula.toUpperCase()
            : extraerCedulaDeDescripcion(selectDescription);

          const mat = material ? normalizeValue(material) : ''

          const term = termino === 'NO ASIGNADO' || !termino ? '' : termino
          const aca = acabado === 'NO ASIGNADO' || !acabado ? '' : acabado


          const addTypes = `${desc}  ${mat}  ${!termino ? '' : omit[termino] ? '' : termino} ${!acabado ? '' : omit[acabado] ? '' : acabado} `


          const analyzeResult = {
            id: normalizarGrados(ean),
            product: 'VALVULA',
            material: material ? normalizeValue(material) : '',
            diameter,
            ced: cedulaFinal ?? '',
            termino: term,
            acabado: aca,
            subtipo: sub,
            figura,
            originalDescription: selectDescription,
            ean,
            description: normalizeValue(addTypes),
          };

          // console.log(analyzeResult)

          return analyzeResult
        })


        await upsert.execute(concatDescrandEan); // Aquí haces el embed de solo ese lote

        offset += limit;

        if (rows.length < limit) {
          hasMore = false;
          console.log('Último lote procesado.');
          break;
        }

        console.log('Esperando 1 minuto antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        // await new Promise(resolve => setTimeout(resolve, 10000));


      } catch (error) {

        console.error(`Error en el lote OFFSET ${offset}:`, error);
        break;
      }
    }

  }


  private upsertCodos = async () => {

    const limit = 200;
    let offset = 0;
    let hasMore = true;

    let concatDescrandEan;



    while (hasMore) {
      try {
        const [rows] = await this.pool.query(
          `
          SELECT ICOD,IEAN as ean,
          I2DESCR AS          description2,
          IDESCR AS           description1,
          FAM2.FAMDESCR as    tipo,
          FAM3.FAMDESCR as    radio,
          FAM4.FAMDESCR as    material,
          FAM8.FAMDESCR as    diametro,
          FAM7.FAMDESCR as    cedula,
          UDESCR as           unidad,
          FAM5.FAMDESCR as    termino,
          FAMC.FAMDESCR as    acabado

          FROM FINV
          LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM=FINV.IFAM2
          LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM=FINV.IFAM3
          LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM=FINV.IFAM4
          LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM=FINV.IFAM8
          LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM=FINV.IFAM7
          LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM=FINV.IFAM5
          LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM=FINV.IFAMC
          LEFT JOIN FUNIDAD ON FUNIDAD.UCOD=FINV.IUM
          LEFT JOIN FINV2 ON FINV2.I2KEY=FINV.ISEQ
          WHERE  mid(ICOD,1,2)='01' and I2DESCR like 'CODO%' AND IEAN <> ''
          LIMIT ? OFFSET ?;
        `,
          [limit, offset]
        ) as unknown as any;



        if (rows.length === 0) {
          hasMore = false;
          console.log('No hay más productos.');
          break;
        }

        console.log(`Procesando lote OFFSET ${offset}, total: ${rows.length}`);

        const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone);


        const terminos = {
          BISELADO: 'BISELADO',
          PLANO: 'PLANO',
          RANURADO: 'RANURADO',
          ROSCADO: 'ROSCADO',
          'NO ASIGNADO': 'NO ASIGNADO',
        }

        const omit = {
          BISELADO: 'BISELADO',
          PLANO: 'PLANO',
          'NO ASIGNADO': 'NO ASIGNADO',
          NEGRO: 'NEGRO',
          POLIURETANO: 'POLIURETANO',
          SW: 'SW'
        }

        const acabados = {
          NEGRO: 'NEGRO',
          'NO ASIGNADO': 'NO ASIGNADO',
          GALVANIZADO: 'GALVANIZADO',
          ROJA: 'ROJA',
          POLIURETANO: 'POLIURETANO',
        }


        concatDescrandEan = rows.map((r, i) => {


          const {
            ean,
            radio,
            material,
            diametro,
            cedula,
            termino,
            acabado
          } = r as Record<string, string>

          const diameter = diametro ? cleanDiameter(diametro) : ''

          const cedOrSW = ((cedula === 'STD' || cedula === '40') && cedula) ?? ((termino === 'SW') && termino)

          const selectDescription = r.description2

          const figura = extraerFiguraDeDescripcion(selectDescription) ?? ''

          const desc = normalizarDescripcionSWPorCedula(selectDescription, cedOrSW)


          const { angulo, radio: radi } = extractAnguloRadio(radio === 'NO ASIGNADO' || !radio ? selectDescription : radio)

          let cedulaFinal = cedula && cedula.toUpperCase() !== 'NO ASIGNADO' && cedula !== ''
            ? cedula.toUpperCase()
            : extraerCedulaDeDescripcion(selectDescription);

          const mat = material ? normalizeValue(material) : ''

          const term = termino === 'NO ASIGNADO' || !termino ? '' : termino
          const aca = acabado === 'NO ASIGNADO' || !acabado ? '' : acabado
          const rad = radi ?? ''
          const ang = angulo ?? ''

          const addTypes = ` ${desc}  ${mat}  ${!termino ? '' : omit[termino] ? '' : termino} ${!acabado ? '' : omit[acabado] ? '' : acabado} `


          const analyzeResult = {
            id: normalizarGrados(ean),
            product: 'CODO',
            material: material ? normalizeValue(material) : '',
            diameter,
            ced: cedulaFinal ?? '',
            termino: term,
            acabado: aca,
            radio: rad,
            angulo: ang,
            figura,
            originalDescription: selectDescription,
            ean,
            description: normalizeValue(addTypes),
          };

          return analyzeResult
        })


        await upsert.execute(concatDescrandEan); // Aquí haces el embed de solo ese lote

        offset += limit;

        if (rows.length < limit) {
          hasMore = false;
          console.log('Último lote procesado.');
          break;
        }

        console.log('Esperando 1 minuto antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        // await new Promise(resolve => setTimeout(resolve, 10000));


      } catch (error) {

        console.error(`Error en el lote OFFSET ${offset}:`, error);
        break;
      }
    }
  }



  private upsertTubos = async () => {

    const limit = 200;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const [rows] = await this.pool.query(
          `
          SELECT ICOD,IEAN as ean,
          I2DESCR AS description2,
          IDESCR AS description1,
          FAM2.FAMDESCR as tipo,
          FAM3.FAMDESCR as costura,
          FAM4.FAMDESCR as material,
          FAM8.FAMDESCR as diametro,
          FAM7.FAMDESCR as cedula,
          UDESCR as unidad,
          FAM5.FAMDESCR as termino,
          FAMC.FAMDESCR as acabado

          FROM FINV
          LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM=FINV.IFAM2
          LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM=FINV.IFAM3
          LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM=FINV.IFAM4
          LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM=FINV.IFAM8
          LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM=FINV.IFAM7
          LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM=FINV.IFAM5
          LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM=FINV.IFAMC
          LEFT JOIN FUNIDAD ON FUNIDAD.UCOD=FINV.IUM
          LEFT JOIN FINV2 ON FINV2.I2KEY=FINV.ISEQ
          WHERE (mid(IEAN,1,3)='TSC' OR mid(IEAN,1,3)='TCC' ) AND mid(ICOD,1,2)='01'
          LIMIT ? OFFSET ?;
        `,
          [limit, offset]
        ) as any[];

        console.log(rows.length)

        if (rows.length === 0) {
          hasMore = false;
          console.log('No hay más productos.');
          break;
        }

        console.log(`Procesando lote OFFSET ${offset}, total: ${rows.length}`);

        const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone);





        const terminos = {
          BISELADO: 'BISELADO',
          PLANO: 'PLANO',
          RANURADO: 'RANURADO',
          ROSCADO: 'ROSCADO',
          'NO ASIGNADO': 'NO ASIGNADO',
        }

        const omit = {
          BISELADO: 'BISELADO',
          PLANO: 'PLANO',
          'NO ASIGNADO': 'NO ASIGNADO',
          NEGRO: 'NEGRO',
          POLIURETANO: 'POLIURETANO',
        }

        const acabados = {
          NEGRO: 'NEGRO',
          'NO ASIGNADO': 'NO ASIGNADO',
          GALVANIZADO: 'GALVANIZADO',
          ROJA: 'ROJA',
          POLIURETANO: 'POLIURETANO',
        }



        const concatDescrandEan = rows.map((r) => {

          const { tipo, costura, material, diametro, cedula, unidad, termino, acabado, ean } = r as Record<string, string>

          const selectDescription = r.description2 ?? r.description1

          const cleanDescription = extraerDesdeTubo(selectDescription);

          const ced = cedula === 'NO ASIGNADO' || !cedula ? '' : cedula

          const addTypes = `${normalizarTubo(tipo)} de ${material} (${costura}) (${diametro} ${ced})  en ${unidad}  ${omit[termino] ? '' : termino} ${omit[acabado] ? '' : acabado ?? ''} `

          const normalizePipe = normalizarTubo(tipo)
          const analyzeResult = {
            product: normalizeValue(normalizePipe),
            costura: costura ? normalizeValue(costura) : '',
            material: normalizeValue(material),
            diameter: diametro ?? '',
            ced: cedula ?? '',
            acabado: acabado ?? '',
            originalDescription: r.description2 ?? r.description1,
            ean,
            // familias: ["tubos", "sin costura", "acero al carbón", '4"', "80"],
            description: addTypes,
            // ...otros campos
          };




          return {
            id: ean,
            ...analyzeResult,
            description: normalizeValue(analyzeResult.description)
          }
        })
        await upsert.execute(concatDescrandEan); // Aquí haces el embed de solo ese lote

        // for (let p of concatDescrandEan) {

        //   console.log(p)
        // }

        offset += limit;

        if (rows.length < limit) {
          hasMore = false;
          console.log('Último lote procesado.');
          break;
        }

        console.log('Esperando 1 minuto antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        // await new Promise(resolve => setTimeout(resolve, 1000));


      } catch (error) {
        console.error(`Error en el lote OFFSET ${offset}:`, error);
        break;
      }
    }

  }

  private upsertBridas = async () => {

    const limit = 200;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const [rows] = await this.pool.query(
          `
          SELECT ICOD,
          IEAN as ean,
          I2DESCR AS description2,
          IDESCR AS description1,
          FAM2.FAMDESCR as tipo,
          FAM3.FAMDESCR as subtipo,
          FAM4.FAMDESCR as material,
          FAM8.FAMDESCR as diametro,
          FAM7.FAMDESCR as cedula,
          UDESCR as unidad,
          FAM5.FAMDESCR as termino,
          FAMC.FAMDESCR as acabado
                  
          FROM FINV
          LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM=FINV.IFAM2
          LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM=FINV.IFAM3
          LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM=FINV.IFAM4
          LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM=FINV.IFAM8
          LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM=FINV.IFAM7
          LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM=FINV.IFAM5
          LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM=FINV.IFAMC
          LEFT JOIN FUNIDAD ON FUNIDAD.UCOD=FINV.IUM
          LEFT JOIN FINV2 ON FINV2.I2KEY=FINV.ISEQ
          WHERE  mid(ICOD,1,2)='01' and I2DESCR like 'BRIDA%'
          LIMIT ? OFFSET ?;
        `,
          [limit, offset]
        ) as any[];

        console.log(rows.length)

        if (rows.length === 0) {
          hasMore = false;
          console.log('No hay más productos.');
          break;
        }

        console.log(`Procesando lote OFFSET ${offset}, total: ${rows.length}`);

        const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone);


        const concatDescrandEan = rows.map((r) => {

          const {
            ean,
            description2,
            description1,

            subtipo,
            material,
            diametro,
            cedula,
            unidad,
            termino,
            acabado,
          } = r as Record<string, string>

          const selectDescription = description2 ?? description1

          const diameter = diametro === 'NO ASIGNADO' || !diametro ? '' : cleanDiameter(diametro)

          const finish = acabado === 'NO ASIGNADO' || !acabado ? '' : acabado

          const ced = cedula === 'NO ASIGNADO' || !cedula ? '' : cedula

          const presion = extraerPresion(selectDescription)

          const tipo = quitarPalabraBrida(subtipo)

          const grado = extraerGradoMaterialBrida(selectDescription)
          const term = termino === 'NO ASIGNADO' || !termino ? '' : termino




          const analyzeResult = {
            product: 'BRIDA',
            material: normalizeValue(material),
            tipo,
            grado: grado ?? '',
            diameter,
            presion: presion ?? '',
            ced: ced,
            acabado: finish,
            termino: term,
            originalDescription: selectDescription,
            ean,
            description: selectDescription,
          };




          return {
            id: ean,
            ...analyzeResult,
            description: normalizeValue(analyzeResult.description)
          }
        })
        await upsert.execute(concatDescrandEan); // Aquí haces el embed de solo ese lote

        for (let p of concatDescrandEan) {

          console.log(p)
        }

        offset += limit;

        if (rows.length < limit) {
          hasMore = false;
          console.log('Último lote procesado.');
          break;
        }

        console.log('Esperando 1 minuto antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        // await new Promise(resolve => setTimeout(resolve, 1000));


      } catch (error) {
        console.error(`Error en el lote OFFSET ${offset}:`, error);
        break;
      }
    }

  }

  private upsertTubosPlasticos = async () => {
    const limit = 1;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const [rows] = await this.pool.query(
          `
          SELECT ICOD,
          IEAN as ean,
          I2DESCR AS description2,
          IDESCR AS description1,
          FAM2.FAMDESCR as tipo,
          FAM3.FAMDESCR as subtipo,
          FAM4.FAMDESCR as material,
          FAM8.FAMDESCR as diametro,
          FAM7.FAMDESCR as cedula,
          UDESCR as unidad,
          FAM5.FAMDESCR as termino,
          FAMC.FAMDESCR as acabado

          FROM FINV
          LEFT JOIN FFAM AS FAM2 ON FAM2.FAMTNUM=FINV.IFAM2
          LEFT JOIN FFAM AS FAM3 ON FAM3.FAMTNUM=FINV.IFAM3
          LEFT JOIN FFAM AS FAM4 ON FAM4.FAMTNUM=FINV.IFAM4
          LEFT JOIN FFAM AS FAM8 ON FAM8.FAMTNUM=FINV.IFAM8
          LEFT JOIN FFAM AS FAM7 ON FAM7.FAMTNUM=FINV.IFAM7
          LEFT JOIN FFAM AS FAM5 ON FAM5.FAMTNUM=FINV.IFAM5
          LEFT JOIN FFAM AS FAMC ON FAMC.FAMTNUM=FINV.IFAMC
          LEFT JOIN FUNIDAD ON FUNIDAD.UCOD=FINV.IUM
          LEFT JOIN FINV2 ON FINV2.I2KEY=FINV.ISEQ
          WHERE  mid(ICOD,1,2)='01'  
          and I2DESCR like 'TUB%' 
          and (FAM4.FAMDESCR = 'HDPE' or FAM4.FAMDESCR = 'PVC' or FAM4.FAMDESCR = 'PLASTICO' or FAM4.FAMDESCR = 'CPVC' or FAM4.FAMDESCR = 'PPR' )
          and IEAN != ''
          LIMIT ? OFFSET ?;
        `,
          [limit, offset]
        ) as any[];

        console.log(rows.length)

        if (rows.length === 0) {
          hasMore = false;
          console.log('No hay más productos.');
          break;
        }

        console.log(`Procesando lote OFFSET ${offset}, total: ${rows.length}`);

        const upsert = new UpsertProductsUseCase(this.voyage, this.pinecone);


        const concatDescrandEan = rows.map((r) => {

          const { tipo, material, diametro, cedula, termino, ean, unidad } = r as Record<string, string>

          const selectDescription = r.description2 ?? r.description1



          const ced = verifyData(cedula) ?? (extraerCedulaDeDescripcion(selectDescription) ?? '')
          const term = verifyData(termino) ?? ''



          const description = `${selectDescription} en ${unidad}`

          const diameter = diametro === 'NO ASIGNADO' || !diametro ? '' : cleanDiameter(diametro)

          const analyzeResult = {
            product: 'TUBO',
            tipo: 'PLASTICO',
            costura: '',
            material: normalizeValue(material),
            diameter,
            termino: term,
            ced,
            originalDescription: selectDescription,
            ean,
            description: normalizeValue(description)
          };






          return {
            id: ean,
            ...analyzeResult,
            description: normalizeValue(analyzeResult.description)
          }
        })
        await upsert.execute(concatDescrandEan); // Aquí haces el embed de solo ese lote

        for (let p of concatDescrandEan) {

          console.log(p)
        }

        offset += limit;

        if (rows.length < limit) {
          hasMore = false;
          console.log('Último lote procesado.');
          break;
        }

        console.log('Esperando 1 minuto antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        // await new Promise(resolve => setTimeout(resolve, 1000));


      } catch (error) {
        console.error(`Error en el lote OFFSET ${offset}:`, error);
        break;
      }
    }


  }






}