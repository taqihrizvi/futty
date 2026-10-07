import { NextResponse } from "next/server";
import type { Player } from "@/lib/types";
import { beginRequest, jsonError } from "@/server/http";
import { removePlayer, updatePlayer } from "@/server/repository";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    const patch = (await request.json()) as Partial<Omit<Player, "id">>;
    return NextResponse.json(await updatePlayer(id, patch));
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await beginRequest();
    const { id } = await context.params;
    return NextResponse.json(await removePlayer(id));
  } catch (error) {
    return jsonError(error, 500);
  }
}
