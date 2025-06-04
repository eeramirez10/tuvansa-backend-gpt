import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { QueryStoreService } from '../../domain/services/query-store-service';
import { envs } from '../../config/envs';


export class QueryStoreRedis implements QueryStoreService {

  readonly redis = new Redis(`redis://${envs.REDIS_USER}:${envs.REDIS_PASSWORD}@redis-15258.c98.us-east-1-4.ec2.redns.redis-cloud.com:15258`)
  constructor(private readonly defaultTTL = 15 * 60) { } // TTL en segundos


  async create(sql: string, ttl?: number): Promise<string> {
    const queryId = randomUUID();
    await this.redis.set(
      this.key(queryId),
      sql,
      'EX',
      ttl ?? this.defaultTTL
    );
    return queryId;
  }

  async get(queryId: string): Promise<string | null> {
    const sql = await this.redis.get(this.key(queryId));
    return sql;
  }

  async delete(queryId: string): Promise<void> {
    await this.redis.del(this.key(queryId));
  }

  private key(id: string): string {
    return `query:${id}`;
  }

  clearExpired(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}