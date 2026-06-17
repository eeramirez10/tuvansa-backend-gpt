
type QuickSpecs = {
  label: string;
  value: string;
}

type TechnicalSpecs = {
  id: string;
  label: string;
  value: string;
  standard: string;
  sortOrder: number;
}

type Images = {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  type: string;
  width: number;
  height: number;
}

type Attributes = {
  material: string;
  diameter: string;
  ced: string;
  costura: string;
  termino: string;
  acabado: string;
  radio: string;
  angulo: string;
  presion: string;
  grado: string;
  figura: string;
}

interface Option {

  id: string;
  sourceIcod: string;
  sourceEan: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  technicalSummary: string;
  description: string;
  quickSpecs: QuickSpecs[];
  technicalSpecs: TechnicalSpecs[]
  images: Images[]
  attributes: Attributes

}


export class ProductEntity {

  public readonly id: string;
  public readonly sourceIcod: string;
  public readonly sourceEan: string;
  public readonly sku: string;
  public readonly name: string;
  public readonly category: string;
  public readonly subcategory: string;
  public readonly technicalSummary: string;
  public readonly description: string;
  public readonly quickSpecs: QuickSpecs[];
  public readonly technicalSpecs: TechnicalSpecs[]
  public readonly images: Images[]
  public readonly attributes: Attributes

  constructor(option: Option) {
    this.id = option.id
    this.sourceIcod = option.sourceIcod
    this.sourceEan = option.sourceEan
    this.sku = option.sku
    this.name = option.name
    this.category = option.category
    this.subcategory = option.subcategory
    this.technicalSummary = option.technicalSummary
    this.description = option.description
    this.quickSpecs = option.quickSpecs
    this.technicalSpecs = option.technicalSpecs
    this.images = option.images
    this.attributes = option.attributes
  }
}