import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add it to .env.");
  }
  if (!pool) pool = new Pool({ connectionString: withSsl(connectionString) });
  return pool;
}

function withSsl(connectionString: string) {
  if (/@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString)) return connectionString;
  if (/[?&]sslmode=no-verify(?:&|$)/.test(connectionString)) return connectionString;
  if (/[?&]sslmode=/.test(connectionString)) {
    return connectionString.replace(/sslmode=[^&]*/, "sslmode=no-verify");
  }
  const join = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${join}sslmode=no-verify`;
}
