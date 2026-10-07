export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const started = globalThis as typeof globalThis & { futtyKeepalive?: boolean };
  if (started.futtyKeepalive) return;

  const base = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, "");
  if (!base) return;

  started.futtyKeepalive = true;
  const { startKeepalive } = await import("./server/keepalive");
  startKeepalive(`${base}/api/health`);
}
