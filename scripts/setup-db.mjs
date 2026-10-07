import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = readFileSync(path.join(root, ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.*)$/m);
if (!match?.[1]) throw new Error("DATABASE_URL is missing from .env");

const pool = new pg.Pool({ connectionString: match[1].trim() });
const sql = readFileSync(path.join(root, "src", "server", "schema.sql"), "utf8");
await pool.query(sql);
await pool.end();
console.log("Futty schema is ready in Postgres.");
