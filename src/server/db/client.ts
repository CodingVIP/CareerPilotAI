import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

export const database = databaseUrl
  ? drizzle(postgres(databaseUrl, { prepare: false, max: Number(process.env.DB_POOL_MAX || 5) }), {
      schema,
    })
  : null;
