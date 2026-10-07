import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { setMyTeam } from "@/server/repository";

export async function PUT(request: Request) {
  try {
    await beginRequest();
    const body = (await request.json()) as { teamId?: string | null };
    return NextResponse.json(await setMyTeam(body.teamId ?? null));
  } catch (error) {
    return jsonError(error, 500);
  }
}
