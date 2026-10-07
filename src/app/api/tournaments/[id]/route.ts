import { NextResponse } from "next/server";
import type { TournamentDetails } from "@/lib/types";
import { beginRequest, jsonError } from "@/server/http";
import { removeTournament, updateTournament } from "@/server/repository";

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

export async function PATCH(request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    const patch = (await request.json()) as TournamentDetails;
    return NextResponse.json(await updateTournament(id, patch));
  } catch (error) {
    return jsonError(error, 500);
  }
}
