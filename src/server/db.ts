import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { contourArenaPool?: Pool };

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add it to .env.");
  }
  if (!globalForDb.contourArenaPool) {
    const pool = new Pool({
      connectionString: withSsl(connectionString),
      max: 2,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (error) => {
      console.error(`Database connection error: ${error.message}`);
    });
    globalForDb.contourArenaPool = pool;
  }
  return globalForDb.contourArenaPool;
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
