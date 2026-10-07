import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { loadState } from "@/server/repository";

export async function GET() {
  try {
    await beginRequest();
    return NextResponse.json(await loadState());
  } catch (error) {
    return jsonError(error, 500);
  }
}
