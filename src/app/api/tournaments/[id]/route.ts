import { NextResponse } from "next/server";
import { beginRequest, jsonError } from "@/server/http";
import { removeTournament } from "@/server/repository";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    return NextResponse.json(await removeTournament(id));
  } catch (error) {
    return jsonError(error, 500);
  }
}
