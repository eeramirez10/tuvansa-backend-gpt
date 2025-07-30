import { Product } from "../datasource/product.datasource";

export abstract class ProductRepository {
  abstract findAll(): Promise<Product[]>
  abstract findAllBatches(): Promise<Product[]>

}