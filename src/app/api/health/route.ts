import { NextResponse } from "next/server";
import { beginRequest } from "@/server/http";

export async function GET() {
  await beginRequest();
  return NextResponse.json({ ok: true });
}
