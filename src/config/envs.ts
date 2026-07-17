import 'dotenv/config'
import { get } from 'env-var'

export const envs = {
  OPEN_API_KEY: get('OPEN_API_KEY').required().asString(),
  URL_MYSQL: get('URL_MYSQL').required().asString(),
  USER_MYSQL: get('USER_MYSQL').required().asString(),
  PASSWORD_MYSQL: get('PASSWORD_MYSQL').required().asString(),
  DB_MYSQL: get('DB_MYSQL').required().asString(),
  DATABASE_URL: get('DATABASE_URL').asString(),
  DIRECT_URL: get('DIRECT_URL').asString(),
  PORT: get('PORT').required().asString(),
  // DEEP_SEEK_API_KEY: get('DEEP_SEEK_API_KEY').asString(),
  // DEEP_SEEK_BASE_URL: get('DEEP_SEEK_BASE_URL').asString(),
  // REDIS_USER : get('REDIS_USER').required().asString(),
  // REDIS_PASSWORD : get('REDIS_PASSWORD').required().asString(),
  PINECONE_API_KEY: get('PINECONE_API_KEY').required().asString(),
  VOYAGEAI_API_KEY: get('VOYAGEAI_API_KEY').required().asString(),
  PINECONE_CATALOG_V2_INDEX: get('PINECONE_CATALOG_V2_INDEX')
    .default('proscai-catalog-v2')
    .asString(),
  PINECONE_CATALOG_VARIANTS_NAMESPACE: get('PINECONE_CATALOG_VARIANTS_NAMESPACE')
    .default('catalog-variants-v1')
    .asString(),
  VOYAGE_CATALOG_V2_MODEL: get('VOYAGE_CATALOG_V2_MODEL')
    .default('voyage-4-large')
    .asString(),
  VOYAGE_CATALOG_V2_DIMENSION: get('VOYAGE_CATALOG_V2_DIMENSION')
    .default('1024')
    .asIntPositive(),
  VOYAGE_CATALOG_V2_MIN_REQUEST_INTERVAL_MS: get('VOYAGE_CATALOG_V2_MIN_REQUEST_INTERVAL_MS')
    .default('25000')
    .asIntPositive(),
  ERP_PRODUCTS_BASE_URL: get('ERP_PRODUCTS_BASE_URL')
    .default('http://localhost:3500/api/erp/products')
    .asString(),
  ERP_PRODUCTS_TIMEOUT_MS: get('ERP_PRODUCTS_TIMEOUT_MS')
    .default('5000')
    .asIntPositive(),
  ERP_PRODUCTS_API_KEY: get('ERP_PRODUCTS_API_KEY').asString(),
}
