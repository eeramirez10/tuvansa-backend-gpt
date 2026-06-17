import { ProductEntity } from "../../domain/entities/product-entity";


export class ProductMapper {

  static toEntity(product: Record<string, any>): ProductEntity {


    return new ProductEntity({
      id: product.id,
      sourceIcod: product.source_icod,
      sourceEan: product.source_ean,
      sku: product.source_ean,
      name: product.display_name,
      category: product.normalized_category,
      subcategory: product.normalized_subcategory,
      technicalSummary: product.technical_summary || product.display_description,
      description: product.display_description,
      quickSpecs: product.quickSpecs,
      technicalSpecs: product.technical_specs.map((spec) => ({
        id: spec.id,
        label: spec.label,
        value: spec.value,
        standard: spec.standard,
        sortOrder: spec.sort_order,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        url: image.storage_url,
        altText: image.alt_text,
        sortOrder: image.sort_order,
        isPrimary: image.is_primary,
        type: image.image_type,
        width: image.width,
        height: image.height,
      })),
      attributes: {
        material: product.normalized_material,
        diameter: product.normalized_diameter,
        ced: product.normalized_ced,
        costura: product.normalized_costura,
        termino: product.normalized_termino,
        acabado: product.normalized_acabado,
        radio: product.normalized_radio,
        angulo: product.normalized_angulo,
        presion: product.normalized_presion,
        grado: product.normalized_grado,
        figura: product.normalized_figura,
      },

    })

  }
}