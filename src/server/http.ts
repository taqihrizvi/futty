import { connection, NextResponse } from "next/server";

export async function beginRequest() {
  await connection();
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json({ error: message }, { status });
}
