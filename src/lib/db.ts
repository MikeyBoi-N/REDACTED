/**
 * PostgreSQL database connection pool (Adapter Pattern).
 *
 * The database configuration is injected via environment variables,
 * not hard-coded. All modules import from this single module.
 *
 * Inputs: DATABASE_URL environment variable
 * Outputs: Shared pg.Pool instance
 * Side Effects: Establishes a connection pool on first import
 */

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/** Execute a parameterized query. */
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Execute a query and return a single row or null. */
export async function queryOne<T>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Execute multiple statements in a transaction. */
export async function transaction<T>(
  callback: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
