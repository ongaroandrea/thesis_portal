// src/lib/server/db/index.js
import { drizzle as DrizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

console.log('Using postgres client for database connection');
// Connect via standard postgres to support interactive db.transaction()
const client = postgres(env.DATABASE_URL, { prepare: false });
const drizzleExport = DrizzlePostgres(client, { schema });

// Initialize Drizzle with the schema
export const db = drizzleExport;
export const databaseClient = client;
