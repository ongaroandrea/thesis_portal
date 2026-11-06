// src/lib/server/db/index.js
import { drizzle as DrizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import * as schema from './schema.js';

// `vite build` imports every server module during post-build analysis, when
// runtime env vars (DATABASE_URL) don't exist yet, e.g. inside the Docker
// builder stage. postgres() connects lazily, so skipping the check there is safe.
if (!env.DATABASE_URL && !building) throw new Error('DATABASE_URL is not set');

// Connect via standard postgres to support interactive db.transaction()
const client = postgres(env.DATABASE_URL, { prepare: false });
const drizzleExport = DrizzlePostgres(client, { schema });

// Initialize Drizzle with the schema
export const db = drizzleExport;
export const databaseClient = client;
