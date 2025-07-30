import { Product, ProductDatasource } from '../../domain/datasource/product.datasource';
import { ProductRepository } from "../../domain/repositories/product.repository";

export class ProscaiProductsRepositoryImpl implements ProductRepository {

  constructor(private readonly productDatasource: ProductDatasource){}

  findAll(): Promise<Product[]> {
    return this.productDatasource.findAll()
  }

   findAllBatches(): Promise<Product[]> {
    return this.productDatasource.findAllBatches()
   }



}