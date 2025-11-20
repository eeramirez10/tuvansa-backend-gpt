
export interface Product {
  ean: string
  description: string
}

export abstract class ProductDatasource {

  abstract findAll(): Promise<Product[]>
  abstract findAllBatches(): Promise<Product[]>

}