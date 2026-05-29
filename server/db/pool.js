import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}
