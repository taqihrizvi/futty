import { getPool } from "./db";

const INTERVAL_MS = 20_000;

export function startKeepalive(url: string) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const [response] = await Promise.all([
        fetch(url, { cache: "no-store" }),
        getPool().query("SELECT 1"),
      ]);
      if (!response.ok) {
        console.error(`Futty cron health returned ${response.status}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "cron failed";
      console.error(`Futty cron failed: ${message}`);
    } finally {
      running = false;
    }
  };

  setTimeout(() => void run(), INTERVAL_MS).unref();
  setInterval(() => void run(), INTERVAL_MS).unref();
  console.log(`Futty cron pings ${url} and the database every ${INTERVAL_MS / 1000} seconds`);
}
