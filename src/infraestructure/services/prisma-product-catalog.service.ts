import { envs } from '../../config/envs';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

type TechnicalSpecRecord = {
  label: string;
  value: string;
  standard?: string | null;
  sort_order: number;
};

type TechnicalSummaryCandidate = {
  id: string;
  source_icod: string;
  display_name: string | null;
  source_description: string | null;
  normalized_category: string | null;
  normalized_subcategory: string | null;
  normalized_material: string | null;
  normalized_diameter: string | null;
  normalized_ced: string | null;
  normalized_costura: string | null;
  normalized_radio: string | null;
  normalized_angulo: string | null;
  normalized_termino: string | null;
  normalized_presion: string | null;
  normalized_norm: string | null;
  normalized_coating: string | null;
  normalized_length: string | null;
  technical_summary: string | null;
};


type ProductImageInput = {
  storage_url: string
  file_name?: string | null
  mime_type?: string | null
  alt_text?: string | null
  sort_order: number
  is_primary?: boolean
  image_type?: string | null
  storage_provider?: string | null
}

type NormalizedCatalogRecord = Prisma.ProductNormalizedUncheckedCreateInput & {
  technical_specs?: TechnicalSpecRecord[];
};
type MissingEanRecord = {
  source_system: string;
  source_country_code: string;
  source_icod: string;
  source_description?: string | null;
  detection_bucket?: string | null;
  detection_source?: string | null;
  detection_first_word?: string | null;
  normalized_product?: string | null;
  normalized_category?: string | null;
  normalized_material?: string | null;
  normalized_diameter?: string | null;
  normalized_ced?: string | null;
  normalized_costura?: string | null;
  normalized_radio?: string | null;
  normalized_angulo?: string | null;
  manual_review_reason?: string | null;
};

export class PrismaProductCatalogService {
  private readonly prisma = new PrismaClient({
    datasources: {
      db: {
        url: envs.DIRECT_URL ?? envs.DATABASE_URL,
      },
    },
  });

  async upsertNormalizedProducts(records: NormalizedCatalogRecord[]) {
    let processed = 0;
    const skippedWithoutEan: MissingEanRecord[] = [];

    for (const record of records) {
      if (!record.source_ean || `${record.source_ean}`.trim() === '') {
        skippedWithoutEan.push({
          source_system: record.source_system,
          source_country_code: record.source_country_code,
          source_icod: record.source_icod,
          source_description: record.source_description ?? undefined,
          detection_bucket: record.detection_bucket,
          detection_source: record.detection_source,
          detection_first_word: record.detection_first_word ?? undefined,
          normalized_product: record.normalized_product,
          normalized_category: record.normalized_category ?? undefined,
          normalized_material: record.normalized_material ?? undefined,
          normalized_diameter: record.normalized_diameter ?? undefined,
          normalized_ced: record.normalized_ced ?? undefined,
          normalized_costura: record.normalized_costura ?? undefined,
          normalized_radio: record.normalized_radio ?? undefined,
          normalized_angulo: record.normalized_angulo ?? undefined,
          manual_review_reason: record.manual_review_reason ?? undefined,
        });
        continue;
      }

      const technicalSpecs = record.technical_specs ?? [];

      const upsertedRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO products_normalized (
          source_system,
          source_country_code,
          source_icod,
          source_ean,
          source_description1,
          source_description2,
          source_description,
          raw_fam2,
          raw_fam3,
          raw_fam4,
          raw_fam5,
          raw_fam7,
          raw_fam8,
          raw_famc,
          raw_unidad,
          detection_bucket,
          detection_source,
          detection_first_word,
          detection_first_word_product,
          detection_confidence,
          detection_notes,
          normalized_product,
          normalized_category,
          normalized_subcategory,
          normalized_material,
          normalized_tipo,
          normalized_subtipo,
          normalized_diameter,
          normalized_ced,
          normalized_costura,
          normalized_termino,
          normalized_acabado,
          normalized_radio,
          normalized_angulo,
          normalized_presion,
          normalized_grado,
          normalized_figura,
          visual_material,
          visual_color,
          visual_finish,
          visual_shape,
          visual_connection_type,
          visual_special_features,
          image_prompt,
          image_negative_prompt,
          technical_summary,
          normalized_norm,
          normalized_coating,
          normalized_length,
          display_name,
          display_description,
          search_text,
          is_active,
          is_searchable,
          requires_manual_review,
          manual_review_reason,
          erp_last_seen_at,
          normalized_at,
          updated_at
        )
        VALUES (
          ${record.source_system},
          ${record.source_country_code},
          ${record.source_icod},
          ${record.source_ean},
          ${record.source_description1 ?? null},
          ${record.source_description2 ?? null},
          ${record.source_description ?? null},
          ${record.raw_fam2 ?? null},
          ${record.raw_fam3 ?? null},
          ${record.raw_fam4 ?? null},
          ${record.raw_fam5 ?? null},
          ${record.raw_fam7 ?? null},
          ${record.raw_fam8 ?? null},
          ${record.raw_famc ?? null},
          ${record.raw_unidad ?? null},
          ${record.detection_bucket},
          ${record.detection_source},
          ${record.detection_first_word ?? null},
          ${record.detection_first_word_product ?? null},
          ${record.detection_confidence ?? null},
          ${record.detection_notes ?? null},
          ${record.normalized_product},
          ${record.normalized_category ?? null},
          ${record.normalized_subcategory ?? null},
          ${record.normalized_material ?? null},
          ${record.normalized_tipo ?? null},
          ${record.normalized_subtipo ?? null},
          ${record.normalized_diameter ?? null},
          ${record.normalized_ced ?? null},
          ${record.normalized_costura ?? null},
          ${record.normalized_termino ?? null},
          ${record.normalized_acabado ?? null},
          ${record.normalized_radio ?? null},
          ${record.normalized_angulo ?? null},
          ${record.normalized_presion ?? null},
          ${record.normalized_grado ?? null},
          ${record.normalized_figura ?? null},
          ${record.visual_material ?? null},
          ${record.visual_color ?? null},
          ${record.visual_finish ?? null},
          ${record.visual_shape ?? null},
          ${record.visual_connection_type ?? null},
          ${record.visual_special_features ?? null},
          ${record.image_prompt ?? null},
          ${record.image_negative_prompt ?? null},
          ${record.technical_summary ?? null},
          ${record.normalized_norm ?? null},
          ${record.normalized_coating ?? null},
          ${record.normalized_length ?? null},
          ${record.display_name ?? null},
          ${record.display_description ?? null},
          ${record.search_text ?? null},
          ${record.is_active},
          ${record.is_searchable},
          ${record.requires_manual_review},
          ${record.manual_review_reason ?? null},
          ${record.erp_last_seen_at ?? null},
          ${record.normalized_at ?? null},
          NOW()
        )
        ON CONFLICT (source_system, source_icod)
        DO UPDATE SET
          source_country_code = EXCLUDED.source_country_code,
          source_ean = EXCLUDED.source_ean,
          source_description1 = EXCLUDED.source_description1,
          source_description2 = EXCLUDED.source_description2,
          source_description = EXCLUDED.source_description,
          raw_fam2 = EXCLUDED.raw_fam2,
          raw_fam3 = EXCLUDED.raw_fam3,
          raw_fam4 = EXCLUDED.raw_fam4,
          raw_fam5 = EXCLUDED.raw_fam5,
          raw_fam7 = EXCLUDED.raw_fam7,
          raw_fam8 = EXCLUDED.raw_fam8,
          raw_famc = EXCLUDED.raw_famc,
          raw_unidad = EXCLUDED.raw_unidad,
          detection_bucket = EXCLUDED.detection_bucket,
          detection_source = EXCLUDED.detection_source,
          detection_first_word = EXCLUDED.detection_first_word,
          detection_first_word_product = EXCLUDED.detection_first_word_product,
          detection_confidence = EXCLUDED.detection_confidence,
          detection_notes = EXCLUDED.detection_notes,
          normalized_product = EXCLUDED.normalized_product,
          normalized_category = EXCLUDED.normalized_category,
          normalized_subcategory = EXCLUDED.normalized_subcategory,
          normalized_material = EXCLUDED.normalized_material,
          normalized_tipo = EXCLUDED.normalized_tipo,
          normalized_subtipo = EXCLUDED.normalized_subtipo,
          normalized_diameter = EXCLUDED.normalized_diameter,
          normalized_ced = EXCLUDED.normalized_ced,
          normalized_costura = EXCLUDED.normalized_costura,
          normalized_termino = EXCLUDED.normalized_termino,
          normalized_acabado = EXCLUDED.normalized_acabado,
          normalized_radio = EXCLUDED.normalized_radio,
          normalized_angulo = EXCLUDED.normalized_angulo,
          normalized_presion = EXCLUDED.normalized_presion,
          normalized_grado = EXCLUDED.normalized_grado,
          normalized_figura = EXCLUDED.normalized_figura,
          visual_material = EXCLUDED.visual_material,
          visual_color = EXCLUDED.visual_color,
          visual_finish = EXCLUDED.visual_finish,
          visual_shape = EXCLUDED.visual_shape,
          visual_connection_type = EXCLUDED.visual_connection_type,
          visual_special_features = EXCLUDED.visual_special_features,
          image_prompt = EXCLUDED.image_prompt,
          image_negative_prompt = EXCLUDED.image_negative_prompt,
          technical_summary = EXCLUDED.technical_summary,
          normalized_norm = EXCLUDED.normalized_norm,
          normalized_coating = EXCLUDED.normalized_coating,
          normalized_length = EXCLUDED.normalized_length,
          display_name = EXCLUDED.display_name,
          display_description = EXCLUDED.display_description,
          search_text = EXCLUDED.search_text,
          is_active = EXCLUDED.is_active,
          is_searchable = EXCLUDED.is_searchable,
          requires_manual_review = EXCLUDED.requires_manual_review,
          manual_review_reason = EXCLUDED.manual_review_reason,
          erp_last_seen_at = EXCLUDED.erp_last_seen_at,
          normalized_at = EXCLUDED.normalized_at,
          updated_at = NOW()
        RETURNING id
      `;

      const productId = upsertedRows[0]?.id;

      if (productId) {
        await this.replaceTechnicalSpecs(productId, technicalSpecs);
      }

      await this.deleteMissingEanRecord(record.source_system, record.source_icod);

      processed += 1;
    }

    if (skippedWithoutEan.length > 0) {
      await this.upsertMissingEanProducts(skippedWithoutEan);
    }

    return {
      processed,
      skippedWithoutEanCount: skippedWithoutEan.length,
      skippedWithoutEan,
    };
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async upsertMissingEanProducts(records: MissingEanRecord[]) {
    let processed = 0;

    for (const record of records) {
      const branchCode = record.source_icod?.slice(0, 2) || null;

      await this.prisma.$executeRaw`
        INSERT INTO products_missing_ean (
          source_system,
          source_country_code,
          branch_code,
          source_icod,
          source_description,
          detection_bucket,
          detection_source,
          detection_first_word,
          normalized_product,
          normalized_category,
          normalized_material,
          normalized_diameter,
          normalized_ced,
          normalized_costura,
          normalized_radio,
          normalized_angulo,
          manual_review_reason,
          first_seen_at,
          last_seen_at,
          created_at,
          updated_at
        )
        VALUES (
          ${record.source_system},
          ${record.source_country_code},
          ${branchCode},
          ${record.source_icod},
          ${record.source_description ?? null},
          ${record.detection_bucket ?? null},
          ${record.detection_source ?? null},
          ${record.detection_first_word ?? null},
          ${record.normalized_product ?? null},
          ${record.normalized_category ?? null},
          ${record.normalized_material ?? null},
          ${record.normalized_diameter ?? null},
          ${record.normalized_ced ?? null},
          ${record.normalized_costura ?? null},
          ${record.normalized_radio ?? null},
          ${record.normalized_angulo ?? null},
          ${record.manual_review_reason ?? 'Falta source_ean en ERP'},
          NOW(),
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (source_system, source_icod)
        DO UPDATE SET
          source_country_code = EXCLUDED.source_country_code,
          branch_code = EXCLUDED.branch_code,
          source_description = EXCLUDED.source_description,
          detection_bucket = EXCLUDED.detection_bucket,
          detection_source = EXCLUDED.detection_source,
          detection_first_word = EXCLUDED.detection_first_word,
          normalized_product = EXCLUDED.normalized_product,
          normalized_category = EXCLUDED.normalized_category,
          normalized_material = EXCLUDED.normalized_material,
          normalized_diameter = EXCLUDED.normalized_diameter,
          normalized_ced = EXCLUDED.normalized_ced,
          normalized_costura = EXCLUDED.normalized_costura,
          normalized_radio = EXCLUDED.normalized_radio,
          normalized_angulo = EXCLUDED.normalized_angulo,
          manual_review_reason = EXCLUDED.manual_review_reason,
          last_seen_at = NOW(),
          updated_at = NOW()
      `;

      processed += 1;
    }

    return { processed };
  }

  async listMissingEanProducts(limit: number, offset: number) {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 500));
    const safeOffset = Math.max(0, Math.floor(offset));

    return this.prisma.$queryRawUnsafe(`
      SELECT
        id,
        source_system,
        source_country_code,
        branch_code,
        source_icod,
        source_description,
        detection_bucket,
        detection_source,
        detection_first_word,
        normalized_product,
        normalized_category,
        normalized_material,
        normalized_diameter,
        normalized_ced,
        normalized_costura,
        normalized_radio,
        normalized_angulo,
        manual_review_reason,
        first_seen_at,
        last_seen_at,
        created_at,
        updated_at
      FROM products_missing_ean
      ORDER BY updated_at DESC, source_icod ASC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `);
  }

  async listProductsForTechnicalSummaryGeneration(params: {
    limit: number;
    offset: number;
    categoryBucket?: string;
    onlyMissing?: boolean;
  }): Promise<TechnicalSummaryCandidate[]> {
    const { limit, offset, categoryBucket, onlyMissing = true } = params;

    return this.prisma.productNormalized.findMany({
      where: {
        ...(categoryBucket ? { detection_bucket: categoryBucket } : {}),
        ...(onlyMissing
          ? {
            OR: [
              { technical_summary: null },
              { technical_summary: '' },
            ],
          }
          : {}),
      },
      orderBy: [{ source_icod: 'asc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        source_icod: true,
        display_name: true,
        source_description: true,
        normalized_category: true,
        normalized_subcategory: true,
        normalized_material: true,
        normalized_diameter: true,
        normalized_ced: true,
        normalized_costura: true,
        normalized_radio: true,
        normalized_angulo: true,
        normalized_termino: true,
        normalized_presion: true,
        normalized_norm: true,
        normalized_coating: true,
        normalized_length: true,
        technical_summary: true,
      },
    });
  }

  async updateTechnicalSummary(productId: string, technicalSummary: string) {
    return this.prisma.productNormalized.update({
      where: { id: productId },
      data: {
        technical_summary: technicalSummary,
        updated_at: new Date(),
      },
      select: {
        id: true,
        source_icod: true,
        technical_summary: true,
      },
    });
  }

  async listProductsImages(productId: string) {

    return await this.prisma.productImage.findMany({
      where: {
        product_normalized_id: productId
      },
      orderBy: [
        { sort_order: 'asc' },
        { created_at: 'asc' }
      ],
      select: {
        id: true,
        product_normalized_id: true,
        image_type: true,
        generation_status: true,
        storage_provider: true,
        storage_url: true,
        file_name: true,
        mime_type: true,
        alt_text: true,
        sort_order: true,
        width: true,
        height: true,
        is_primary: true,
        created_at: true,
        updated_at: true,
      }
    })
  }

  async replaceProductImages(productId: string, images: ProductImageInput[]) {
    if (images.length === 0 || images.length > 4) {
      throw new Error('Debes enviar entre 1 y 4 imagenes.')
    }

    const product = await this.prisma.productNormalized.findUnique({
      where: {
        id: productId
      },
      select: {
        id: true
      }
    })

    if (!product) throw new Error('Producto no encontrado')

    const sortOrders = images.map((image) => image.sort_order)
    const uniqueSortOrders = new Set(sortOrders);

    if (uniqueSortOrders.size !== sortOrders.length) {
      throw new Error('No se permiten sort_order duplicados.')
    }

    if (sortOrders.some((value) => value < 1 || value > 4)) {
      throw new Error('sort_order debe estar entre 1 y 4.');
    }

    const normalizedImages = [...images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({
        storage_url: image.storage_url.trim(),
        file_name: image.file_name?.trim() || null,
        mime_type: image.mime_type?.trim() || null,
        alt_text: image.alt_text?.trim() || null,
        sort_order: image.sort_order,
        is_primary: Boolean(image.is_primary),
        image_type: image.image_type?.trim() || 'GALLERY',
        storage_provider: image.storage_provider?.trim() || 'INTERNAL',
      }))

    if (normalizedImages.some((image) => image.storage_url === '')) {
      throw new Error('Todas las imagenes deben de tener storage_url')
    }

    const primaryCount = normalizedImages.filter((image) => image.is_primary)

    if (primaryCount.length > 1) {
      throw new Error('Solo una imagen puede ser principal.')
    }

    if (primaryCount.length === 0) {
      normalizedImages[0].is_primary = true
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({
        where: {
          product_normalized_id: productId
        }
      })

      await tx.productImage.createMany({
        data: normalizedImages.map((image) => ({
          product_normalized_id: productId,
          image_type: image.image_type,
          generation_status: 'READY',
          storage_provider: image.storage_provider,
          storage_url: image.storage_url,
          file_name: image.file_name,
          mime_type: image.mime_type,
          alt_text: image.alt_text,
          sort_order: image.sort_order,
          is_primary: image.is_primary,
        }))
      });
    })

    return await this.listProductsImages(productId)
  }

  private async deleteMissingEanRecord(sourceSystem: string, sourceIcod: string) {
    await this.prisma.$executeRaw`
      DELETE FROM products_missing_ean
      WHERE source_system = ${sourceSystem}
        AND source_icod = ${sourceIcod}
    `;
  }

  private async replaceTechnicalSpecs(productId: string, specs: TechnicalSpecRecord[]) {
    await this.prisma.productTechnicalSpec.deleteMany({
      where: {
        product_normalized_id: productId,
      },
    });

    if (specs.length === 0) {
      return;
    }

    await this.prisma.productTechnicalSpec.createMany({
      data: specs.map((spec) => ({
        product_normalized_id: productId,
        label: spec.label,
        value: spec.value,
        standard: spec.standard ?? null,
        sort_order: spec.sort_order,
      })),
    });
  }
}
