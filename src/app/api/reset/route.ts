import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { resetState } from "@/server/repository";

export async function POST() {
  try {
    await beginRequest();
    return NextResponse.json(await resetState());
  } catch (error) {
    return jsonError(error, 500);
  }
}
